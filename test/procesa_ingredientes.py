# -*- coding: utf-8 -*- # Especificar codificación por si acaso
import os
import re
import json
import sys
import difflib
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import numpy as np
import google.generativeai as genai
import random # Necesario para elegir plato aleatorio
import time # Para posibles reintentos con pausa

# --- Funciones Auxiliares y de Procesamiento ---

def cargar_ingredientes(filepath):
    """Carga los ingredientes desde un CSV y preprocesa los datos numéricos."""
    try:
        # Intentar leer con diferentes codificaciones comunes si falla la default
        try:
            df = pd.read_csv(filepath)
        except UnicodeDecodeError:
            print(f"[WARN] Falló lectura con codificación default, intentando con 'latin1' para {filepath}")
            try:
                df = pd.read_csv(filepath, encoding='latin1')
            except UnicodeDecodeError:
                print(f"[WARN] Falló lectura con 'latin1', intentando con 'iso-8859-1' para {filepath}")
                df = pd.read_csv(filepath, encoding='iso-8859-1') # Último intento común

    except FileNotFoundError:
        print(f"[ERROR] Archivo de ingredientes no encontrado: {filepath}")
        return pd.DataFrame(), [] # Devuelve DataFrame vacío y lista vacía
    except Exception as e:
        print(f"[ERROR] Error inesperado al leer '{filepath}': {e}")
        return pd.DataFrame(), []


    numeric_cols = [
        'Energía (kcal)', 'Agua (g)', 'Proteínas totales (g)', 'Grasa total (g)',
        'Carbohidratos disponibles (g)', 'Fibra dietaria (g)', 'Calcio (mg)',
        'Fósforo (mg)', 'Zinc (mg)', 'Hierro (mg)',
        'Vitamina A equivalentes totales (µg)', 'Tiamina (mg)', 'Riboflavina (mg)',
        'Niacina (mg)', 'Vitamina C (mg)', 'Sodio (mg)', 'Potasio (mg)'
    ]
    # Verificar que las columnas numéricas existan
    missing_numeric_cols = [col for col in numeric_cols if col not in df.columns]
    if missing_numeric_cols:
        print(f"[ERROR] Faltan columnas numéricas en '{filepath}': {missing_numeric_cols}")
        # Continuar con las columnas disponibles
        numeric_cols = [col for col in numeric_cols if col in df.columns]
        if not numeric_cols:
             print("[ERROR] No hay columnas numéricas válidas para procesar.")
             return pd.DataFrame(), []

    if 'NOMBRE DEL ALIMENTO' not in df.columns:
        print(f"[ERROR] Falta la columna 'NOMBRE DEL ALIMENTO' en '{filepath}'.")
        return pd.DataFrame(), []

    # Intenta convertir a numérico, reemplazando comas y manejando errores
    df[numeric_cols] = df[numeric_cols].apply(
        lambda col: pd.to_numeric(col.astype(str).str.replace(',', '.', regex=False), errors='coerce')
    )
    # Rellena los valores que no se pudieron convertir (NaN) con 0
    df[numeric_cols] = df[numeric_cols].fillna(0)
    # Normaliza los nombres para facilitar comparaciones
    df['NOMBRE_NORMALIZADO'] = df['NOMBRE DEL ALIMENTO'].str.strip().str.lower()
    # Eliminar filas donde el nombre normalizado esté vacío o sea NaN
    df = df.dropna(subset=['NOMBRE_NORMALIZADO'])
    df = df[df['NOMBRE_NORMALIZADO'] != '']
    return df, numeric_cols

# Clustering no se usa activamente en la nueva lógica, pero se mantiene por si se reutiliza
def cluster_ingredientes(df, numeric_cols, n_clusters=7):
    """Agrupa los ingredientes en clusters usando K-Means. (Actualmente no esencial para Opción 1)"""
    if df[numeric_cols].empty or df[numeric_cols].isnull().all().all():
        print("[WARN] No hay datos numéricos válidos para el clustering o df está vacío.")
        df['Cluster'] = -1
        return {}, None, df

    scaler = MinMaxScaler()
    valid_data = df[numeric_cols].dropna()

    if valid_data.empty:
        print("[WARN] No quedan datos válidos después de eliminar NaNs para el clustering.")
        df['Cluster'] = -1
        return {}, None, df

    actual_n_clusters = min(n_clusters, len(valid_data))
    if actual_n_clusters < n_clusters:
        print(f"[WARN] Reduciendo n_clusters a {actual_n_clusters} debido a datos insuficientes.")
    if actual_n_clusters < 2:
        print("[WARN] No hay suficientes datos para formar clusters significativos (se necesita >= 2). Asignando todos a cluster 0.")
        df.loc[valid_data.index, 'Cluster'] = 0
        df['Cluster'] = df['Cluster'].fillna(-1)
        cluster_map = {0: df[df.Cluster == 0]}
        return cluster_map, None, df

    X_scaled = scaler.fit_transform(valid_data)
    # Añadir n_init=10 para evitar warning de futuras versiones
    model = KMeans(n_clusters=actual_n_clusters, init='k-means++',
                   n_init=10, max_iter=300, random_state=0)

    labels = model.fit_predict(X_scaled)
    df.loc[valid_data.index, 'Cluster'] = labels
    df['Cluster'] = df['Cluster'].fillna(-1)
    cluster_map = {int(i): df[df.Cluster == i] for i in df['Cluster'].unique() if i != -1}

    return cluster_map, X_scaled, df

def calcular_totales_gemini(df_ingredientes_db, selection):
    """Calcula los totales nutricionales para una selección de ingredientes usando la BD local."""
    totals = {'Calorías': 0.0, 'Carbohidratos': 0.0, 'Proteínas': 0.0, 'Grasas': 0.0}
    missing_ingredients = []
    found_ingredients_details = [] # Para saber qué se encontró

    # Crear un mapeo de nombre normalizado a nombre original para mensajes de error/info
    # Asegurarse que el índice sea único si hay nombres normalizados duplicados (tomar el primero)
    if not df_ingredientes_db['NOMBRE_NORMALIZADO'].is_unique:
        df_unique_norm = df_ingredientes_db.drop_duplicates(subset=['NOMBRE_NORMALIZADO'], keep='first')
        norm_to_original_name = pd.Series(df_unique_norm['NOMBRE DEL ALIMENTO'].values, index=df_unique_norm['NOMBRE_NORMALIZADO']).to_dict()
    else:
        norm_to_original_name = pd.Series(df_ingredientes_db['NOMBRE DEL ALIMENTO'].values, index=df_ingredientes_db['NOMBRE_NORMALIZADO']).to_dict()


    for item in selection:
        if 'name' not in item or 'grams' not in item:
            print(f"[WARN] Item inválido en selección: {item}. Saltando.")
            continue

        try:
            grams = float(item['grams'])
            if grams < 0: # Permitir 0 pero no negativo
                 print(f"[WARN] Cantidad negativa ({grams}g) para {item['name']}. Saltando cálculo para este item.")
                 continue
            ingredient_name_original = item['name'] # Nombre tal como vino de Gemini/Selección
        except (ValueError, TypeError):
            print(f"[WARN] Gramos no numéricos ('{item.get('grams')}') para {item.get('name', 'Desconocido')}. Saltando.")
            continue

        name_norm = ingredient_name_original.strip().lower()
        # Buscar coincidencia exacta normalizada
        subset = df_ingredientes_db[df_ingredientes_db['NOMBRE_NORMALIZADO'] == name_norm]

        found_match = False
        row = None # Inicializar row

        if not subset.empty:
             found_match = True
             row = subset.iloc[0] # Usar el primer resultado si hay múltiples
             found_ingredients_details.append(f"'{ingredient_name_original}' ({grams:.1f}g)")

        # Si no hay coincidencia exacta, intentar coincidencia cercana
        if not found_match:
            all_normalized_names = df_ingredientes_db['NOMBRE_NORMALIZADO'].unique().tolist() # Usar unique()
            matches = difflib.get_close_matches(name_norm, all_normalized_names, n=1, cutoff=0.85) # Cutoff estricto
            if matches:
                matched_norm_name = matches[0]
                # Recuperar la fila correspondiente (puede haber duplicados normalizados, tomar el primero)
                subset = df_ingredientes_db[df_ingredientes_db['NOMBRE_NORMALIZADO'] == matched_norm_name]
                if not subset.empty:
                    row = subset.iloc[0]
                    original_name_found = row['NOMBRE DEL ALIMENTO']
                    print(f"[INFO] Ingrediente '{ingredient_name_original}' no encontrado exactamente, usando coincidencia cercana: '{original_name_found}'")
                    found_match = True
                    found_ingredients_details.append(f"'{ingredient_name_original}' (match: '{original_name_found}', {grams:.1f}g)")

            if not found_match:
                 missing_ingredients.append(ingredient_name_original)
                 print(f"[ERROR] No se encontró coincidencia exacta ni cercana para: '{ingredient_name_original}'")
                 continue # Saltar al siguiente ingrediente

        # Si se encontró (exacto o cercano), calcular nutrición
        if found_match and row is not None:
            factor = grams / 100.0
            try:
                # Asegurarse de que las columnas existen antes de acceder
                if 'Energía (kcal)' in row:
                    totals['Calorías'] += float(row['Energía (kcal)']) * factor
                if 'Carbohidratos disponibles (g)' in row:
                    totals['Carbohidratos'] += float(row['Carbohidratos disponibles (g)']) * factor
                if 'Proteínas totales (g)' in row:
                    totals['Proteínas'] += float(row['Proteínas totales (g)']) * factor
                if 'Grasa total (g)' in row:
                    totals['Grasas'] += float(row['Grasa total (g)']) * factor
            except (ValueError, TypeError, KeyError) as e:
                 # Usar el nombre original encontrado si es posible
                 row_name = row.get('NOMBRE DEL ALIMENTO', ingredient_name_original)
                 print(f"[WARN] Error al convertir datos nutricionales a número para '{row_name}'. Error: {e}. Sus valores no se sumarán.")
                 if ingredient_name_original not in missing_ingredients:
                     missing_ingredients.append(f"{ingredient_name_original} (error de datos)")


    # Informar sobre ingredientes no encontrados al final
    if missing_ingredients:
        print(f"\n[AVISO] Cálculo nutricional INCOMPLETO.")
        if found_ingredients_details:
             print(f"  Ingredientes usados en el cálculo: {', '.join(found_ingredients_details)}")
        print(f"  Ingredientes de la receta NO ENCONTRADOS en BD local o con datos inválidos: {', '.join(missing_ingredients)}")

    elif found_ingredients_details:
         print(f"  Ingredientes usados en el cálculo: {', '.join(found_ingredients_details)}")
    else:
         print("  [WARN] No se procesó ningún ingrediente para el cálculo nutricional.")


    return totals

def generar_platos_completos(platos_csv, num=3):
    """Genera N platos aleatorios desde un CSV de platos predefinidos (para Opción 2)."""
    try:
        # Intentar leer con diferentes codificaciones
        try:
            dfp = pd.read_csv(platos_csv)
        except UnicodeDecodeError:
            print(f"[WARN] Falló lectura con codificación default, intentando con 'latin1' para {platos_csv}")
            try:
                dfp = pd.read_csv(platos_csv, encoding='latin1')
            except UnicodeDecodeError:
                 print(f"[WARN] Falló lectura con 'latin1', intentando con 'iso-8859-1' para {platos_csv}")
                 dfp = pd.read_csv(platos_csv, encoding='iso-8859-1')

    except FileNotFoundError:
        print(f"[ERROR] Archivo de platos predefinidos no encontrado: {platos_csv}")
        return []
    except Exception as e:
        print(f"[ERROR] Error al leer '{platos_csv}': {e}")
        return []

    # Verificar columnas necesarias
    required_cols = ['NOMBRE DEL ALIMENTO', 'Energía (kcal)', 'Carbohidratos disponibles (g)', 'Proteínas totales (g)', 'Grasa total (g)']
    missing_cols = [col for col in required_cols if col not in dfp.columns]
    if missing_cols:
        print(f"[ERROR] Faltan columnas requeridas en {platos_csv}. Se necesitan: {missing_cols}")
        return []

    # Limpiar datos numéricos en dfp
    numeric_cols_platos = ['Energía (kcal)', 'Carbohidratos disponibles (g)', 'Proteínas totales (g)', 'Grasa total (g)']
    for col in numeric_cols_platos:
        # Comprobar si la columna existe antes de intentar convertirla
        if col in dfp.columns:
             dfp[col] = pd.to_numeric(dfp[col].astype(str).str.replace(',', '.', regex=False), errors='coerce')
    dfp = dfp.dropna(subset=numeric_cols_platos) # Eliminar filas con NaN en columnas numéricas clave
    # Asegurarse de que la columna de energía existe antes de filtrar
    if 'Energía (kcal)' in dfp.columns:
        dfp = dfp[dfp['Energía (kcal)'] > 0] # Filtrar kcal > 0

    if dfp.empty:
        print(f"[WARN] No quedan platos válidos en '{platos_csv}' después de la limpieza.")
        return []

    res = []
    num_to_sample = min(num, len(dfp))
    if num_to_sample < num:
        print(f"[WARN] Se pidieron {num} platos, pero solo hay {len(dfp)} válidos disponibles en {platos_csv}.")

    if num_to_sample == 0:
        return []

    # Usar try-except por si dfp queda vacío después de filtros y sample falla
    try:
        sampled_dishes = dfp.sample(n=num_to_sample, random_state=random.randint(1,1000))
    except ValueError:
         print(f"[WARN] No se pudieron seleccionar muestras de '{platos_csv}', podría estar vacío.")
         return []


    for _, row in sampled_dishes.iterrows():
        try:
            # Verificar que las columnas necesarias existen en la fila
            if not all(col in row for col in required_cols):
                print(f"[WARN] Fila incompleta en {platos_csv}, saltando: {row.get('NOMBRE DEL ALIMENTO', 'Fila sin nombre')}")
                continue

            E = float(row['Energía (kcal)'])
            C = float(row['Carbohidratos disponibles (g)'])
            P = float(row['Proteínas totales (g)'])
            F = float(row['Grasa total (g)'])

            # E>0 ya fue filtrado
            percentages = {
                'Carbohidratos': (C * 4 / E * 100),
                'Proteínas':     (P * 4 / E * 100),
                'Grasas':        (F * 9 / E * 100)
            }

            res.append({
                'Plato': row['NOMBRE DEL ALIMENTO'],
                'Energía': E, 'Carbohidratos': C, 'Proteínas': P, 'Grasas': F,
                'Porcentajes': percentages
            })
        except (ValueError, TypeError, KeyError) as e: # Capturar errores específicos de conversión o acceso
            print(f"[WARN] Error procesando fila del plato '{row.get('NOMBRE DEL ALIMENTO', 'Desconocido')}': {e}. Saltando.")
            continue
        except Exception as e: # Captura más genérica por si acaso
            print(f"[WARN] Error inesperado procesando fila del plato '{row.get('NOMBRE DEL ALIMENTO', 'Desconocido')}': {e}. Saltando.")
            continue

    return res


# --- Funciones de Interacción con Gemini ---

# Variable global para almacenar el estado de configuración de la API
__gemini_api_configured = False

def configure_gemini_api(api_key=None):
    """Configura la API de Gemini una sola vez."""
    global __gemini_api_configured
    if __gemini_api_configured:
        return True # Ya configurada

    key_to_use = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GENAI_API_KEY")

    if key_to_use:
        try:
            genai.configure(api_key=key_to_use)
            # Intenta hacer una llamada simple para verificar la clave (opcional)
            # genai.list_models()
            __gemini_api_configured = True
            print("[INFO] API Key de Gemini configurada exitosamente.")
            return True
        except Exception as e:
            print(f"[ERROR] Falló la configuración de la API Key de Gemini: {e}")
            __gemini_api_configured = False
            return False
    else:
        print("[ERROR] No se proporcionó API Key ni se encontró en variables de entorno.")
        __gemini_api_configured = False
        return False

def is_gemini_api_configured():
    """Verifica si la API de Gemini fue configurada exitosamente."""
    return __gemini_api_configured


def ask_gemini_to_suggest_ingredients(target_dish_name, available_ingredients_df, max_retries=3):
    """Pide a Gemini ingredientes clave para un plato, usando solo los disponibles."""
    if not is_gemini_api_configured():
       print("[ERROR] La API de Gemini no está configurada. No se puede continuar.")
       # Podrías intentar configurarla aquí o simplemente fallar.
       # raise ValueError("API Key no configurada.")
       return None # Fallar si no está configurada

    # El resto de la función sigue igual...
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"[ERROR] No se pudo crear el modelo Gemini ('gemini-1.5-flash'). ¿API Key válida? Error: {e}")
        return None

    available_names_original = available_ingredients_df['NOMBRE DEL ALIMENTO'].unique().tolist()
    if not available_names_original:
        print("[ERROR] La lista de ingredientes disponibles del DataFrame está vacía.")
        return None

    available_names_norm_set = set(available_ingredients_df['NOMBRE_NORMALIZADO'].unique())
    norm_to_original_map = pd.Series(available_ingredients_df['NOMBRE DEL ALIMENTO'].values, index=available_ingredients_df['NOMBRE_NORMALIZADO']).to_dict()


    prompt = (
        f"Eres un asistente de cocina experto. El plato objetivo es '{target_dish_name}'.\n"
        "Analiza la siguiente lista de ingredientes disponibles:\n"
        f"```\n{', '.join(available_names_original)}\n```\n\n"
        "Selecciona entre 3 y 7 ingredientes CLAVE de esa lista que sean característicos o comúnmente usados en el plato "
        f"'{target_dish_name}' o una variación muy cercana. Debes elegir ÚNICAMENTE de la lista proporcionada.\n"
        "Responde SÓLO con un objeto JSON que contenga una lista llamada 'suggested_ingredients' con los nombres EXACTOS tal como aparecen en la lista que te di.\n"
        "Ejemplo de formato de respuesta JSON:\n"
        "{\n"
        "  \"suggested_ingredients\": [\"Nombre Ingrediente A de la Lista\", \"Nombre Ingrediente B de la Lista\", \"Nombre Ingrediente C de la Lista\"]\n"
        "}\n"
        "Si crees que NINGUNO de los ingredientes proporcionados encaja razonablemente con el plato, responde con una lista vacía: {\"suggested_ingredients\": []}"
    )

    for i in range(1, max_retries + 1):
        print(f"[INFO] Intento {i}/{max_retries} para sugerir ingredientes para '{target_dish_name}'...")
        try:
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ]
            resp = model.generate_content(prompt, safety_settings=safety_settings)

            # Manejo de respuesta bloqueada o vacía
            if not resp.parts:
                 feedback = getattr(resp, 'prompt_feedback', None)
                 block_reason = getattr(feedback, 'block_reason', 'Razón desconocida')
                 print(f"[WARN] La respuesta de Gemini fue bloqueada o vacía en intento {i}. Razón: {block_reason}")
                 time.sleep(2)
                 continue

            text = resp.text

            # Limpieza robusta de JSON
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                clean = match.group(0)
            else:
                clean = re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()

            # Añadir manejo por si clean queda vacío
            if not clean:
                print(f"[WARN] Respuesta de Gemini vacía o no contenía JSON en intento {i}. Texto original: '{text}'")
                time.sleep(1)
                continue


            data = json.loads(clean)

            if isinstance(data, dict) and 'suggested_ingredients' in data and isinstance(data['suggested_ingredients'], list):
                 suggested_list = data['suggested_ingredients']
                 if not suggested_list:
                     print(f"[INFO] Gemini no sugirió ingredientes de la lista para '{target_dish_name}'.")
                     return [] # Lista vacía es resultado válido

                 valid_suggestions_original_names = []
                 invalid_suggestions = []

                 for suggestion in suggested_list:
                      if not isinstance(suggestion, str):
                           invalid_suggestions.append(str(suggestion))
                           continue

                      suggestion_norm = suggestion.strip().lower()
                      if suggestion_norm in available_names_norm_set:
                           original_name = norm_to_original_map.get(suggestion_norm)
                           if original_name and original_name not in valid_suggestions_original_names:
                                valid_suggestions_original_names.append(original_name)
                           elif not original_name:
                               print(f"[WARN] Inconsistencia interna: Sugerencia normalizada '{suggestion_norm}' no encontrada en mapeo. Omitiendo.")
                               invalid_suggestions.append(suggestion + " (error mapeo)")
                      else:
                           invalid_suggestions.append(suggestion)

                 if invalid_suggestions:
                     print(f"[WARN] Gemini sugirió ingredientes NO disponibles o en formato incorrecto: {invalid_suggestions}.")

                 if not valid_suggestions_original_names:
                      print(f"[WARN] Ninguna sugerencia de Gemini fue válida o encontrada en la lista disponible en intento {i}. Reintentando...")
                      continue

                 print(f"[INFO] Gemini sugirió ingredientes válidos para '{target_dish_name}': {valid_suggestions_original_names}")
                 return valid_suggestions_original_names

            else:
                print(f"[WARN] Respuesta de sugerencia no tiene la estructura JSON esperada en intento {i}/{max_retries}: '{clean}'. Reintentando...")

        except json.JSONDecodeError:
            print(f"[WARN] Respuesta de sugerencia no es JSON válido en intento {i}/{max_retries}: '{clean}'. Reintentando...")
        except Exception as e:
            # Intentar obtener más detalles del error de la API si es posible
            error_details = str(e)
            # Por ejemplo, en algunos errores de google-api-core:
            # if hasattr(e, 'message'): error_details = e.message
            # if hasattr(e, 'details'): error_details += f" Details: {e.details()}"
            print(f"[ERROR] Error inesperado llamando a Gemini para sugerir ingredientes en intento {i}/{max_retries}: {error_details}")


        time.sleep(2) # Pausa antes de reintentar

    print(f"[ERROR] Gemini no pudo sugerir ingredientes válidos para '{target_dish_name}' tras {max_retries} intentos.")
    return None

def ask_gemini_to_select(prototypes, num_dishes, target, max_retries=3):
    """Pide a Gemini que genere recetas específicas usando los prototipos."""
    if not is_gemini_api_configured():
       print("[ERROR] La API de Gemini no está configurada. No se puede continuar.")
       raise ValueError("API Key no configurada.")

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"[ERROR] No se pudo crear el modelo Gemini ('gemini-1.5-flash'). ¿API Key válida? Error: {e}")
        raise ValueError(f"Fallo al crear modelo Gemini: {e}")


    if not prototypes:
        print("[ERROR] Lista de prototipos vacía para generar recetas.")
        raise ValueError("No se pueden generar platos sin prototipos.")

    # Filtrar prototipos y validar estructura
    valid_prototypes = []
    required_keys = ['name', 'energy', 'protein', 'fat', 'carbs']
    for p in prototypes:
        if isinstance(p, dict) and all(k in p for k in required_keys):
            try:
                {k: float(p[k]) for k in required_keys if k != 'name'}
                valid_prototypes.append(p)
            except (ValueError, TypeError):
                 print(f"[WARN] Prototipo '{p.get('name', 'Desconocido')}' tiene valores no numéricos y será omitido.")
        else:
            print(f"[WARN] Prototipo con formato inválido omitido: {p}")

    if not valid_prototypes:
        print("[ERROR] No quedaron prototipos válidos después del filtrado.")
        raise ValueError("No hay prototipos válidos para enviar a Gemini.")

    prototype_names = [p['name'] for p in valid_prototypes] # Nombres de los prototipos válidos
    prototype_names_set = set(prototype_names) # Para búsqueda rápida

    prompt = (
        "Eres un chef global maestro y nutricionista experto. Tienes disponibles los siguientes ingredientes prototipo (nombre y nutrición por 100g):\n"
        f"```json\n{json.dumps(valid_prototypes, ensure_ascii=False, indent=2)}\n```\n\n"
        f"Genera exactamente {num_dishes} platos REALES conocidos globalmente. No inventes nombres.\n"
        "Para CADA plato:\n"
        f"1. Usa entre 3 y 5 ingredientes EXCLUSIVAMENTE de la lista de prototipos proporcionada: {', '.join(prototype_names)}.\n"
        "2. Indica el nombre del plato ('dish_name'). Debe ser un plato real y reconocible.\n"
        "3. Lista los nombres EXACTOS de los ingredientes usados de la lista de prototipos ('ingredients'). Los nombres deben coincidir perfectamente con los nombres de los prototipos.\n"
        "4. Indica las cantidades EN GRAMOS para cada ingrediente ('weights_g'), ajustadas para cumplir los siguientes objetivos nutricionales TOTALES por plato:\n"
        f"   - Energía Total: {target['Calorías'][0]} – {target['Calorías'][1]} kcal\n"
        f"   - % Energía de Carbohidratos: {target['Carbohidratos'][0]}% – {target['Carbohidratos'][1]}%\n"
        f"   - % Energía de Proteínas: {target['Proteínas'][0]}% – {target['Proteínas'][1]}%\n"
        f"   - % Energía de Grasas: {target['Grasas'][0]}% – {target['Grasas'][1]}%\n"
        "Responde ÚNICAMENTE con un objeto JSON válido que contenga una lista llamada 'dishes'. Cada elemento de la lista debe ser un objeto con las claves: 'dish_name' (string), 'ingredients' (lista de strings EXACTAMENTE como en los prototipos), y 'weights_g' (lista de números positivos).\n"
        "Ejemplo de formato de respuesta JSON:\n"
        "{\n"
        "  \"dishes\": [\n"
        "    {\n"
        "      \"dish_name\": \"Nombre Plato Ejemplo 1\",\n"
        f"      \"ingredients\": [\"{prototype_names[0]}\", \"{prototype_names[1 % len(prototype_names)]}\", \"{prototype_names[2 % len(prototype_names)]}\"],\n" # Ejemplo más robusto
        "      \"weights_g\": [150.5, 100, 50]\n"
        "    }\n"
        "    // ... (más platos si se pidieron)\n"
        "  ]\n"
        "}\n"
        "Si no puedes crear platos que cumplan estrictamente todas las condiciones (incluyendo usar SOLO los prototipos dados y cumplir rangos nutricionales) con los prototipos disponibles, devuelve un JSON con una lista vacía: {\"dishes\": []}"
    )

    for i in range(1, max_retries + 1):
        print(f"[INFO] Intento {i}/{max_retries} para generar recetas con Gemini...")
        try:
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ]
            resp = model.generate_content(prompt, safety_settings=safety_settings)

            if not resp.parts:
                 feedback = getattr(resp, 'prompt_feedback', None)
                 block_reason = getattr(feedback, 'block_reason', 'Razón desconocida')
                 print(f"[WARN] La respuesta de Gemini fue bloqueada o vacía en intento {i}. Razón: {block_reason}")
                 time.sleep(3) # Pausa más larga para generación
                 continue

            text = resp.text

            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                clean = match.group(0)
            else:
                clean = re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()

            if not clean:
                print(f"[WARN] Respuesta de Gemini vacía o no contenía JSON en intento {i}. Texto original: '{text}'")
                time.sleep(1)
                continue

            data = json.loads(clean)

            if isinstance(data, dict) and 'dishes' in data and isinstance(data['dishes'], list):
                all_dishes_valid = True
                if not data['dishes']:
                    print("[INFO] Gemini devolvió una lista de platos vacía (puede que no encontrara combinaciones válidas).")
                    return json.dumps(data) # Respuesta válida

                # Validar cada plato
                for dish_idx, dish in enumerate(data['dishes']):
                    dish_valid = True
                    # Estructura básica y tipos
                    if not (isinstance(dish, dict) and
                            all(k in dish for k in ['dish_name', 'ingredients', 'weights_g']) and
                            isinstance(dish['dish_name'], str) and dish['dish_name'].strip() != "" and
                            isinstance(dish['ingredients'], list) and
                            isinstance(dish['weights_g'], list) and
                            len(dish['ingredients']) == len(dish['weights_g']) and
                            3 <= len(dish['ingredients']) <= 7): # Rango de ingredientes flexible (3-7?)
                        dish_valid = False
                        print(f"[WARN] Plato #{dish_idx+1} con formato/estructura/num_ingredientes inválido en intento {i}: {dish}")

                    # Ingredientes y pesos si estructura OK
                    if dish_valid:
                        for ing_idx, ingredient_name in enumerate(dish['ingredients']):
                             if not isinstance(ingredient_name, str) or ingredient_name not in prototype_names_set:
                                  dish_valid = False
                                  print(f"[WARN] Plato '{dish.get('dish_name')}' usa ingrediente inválido o no solicitado: '{ingredient_name}'. Permitidos: {prototype_names}. Intento {i}.")
                                  break
                             try:
                                 weight = float(dish['weights_g'][ing_idx])
                                 if weight <= 0: # Permitir 0? Quizás mejor > 0 estrictamente
                                     dish_valid = False
                                     print(f"[WARN] Plato '{dish.get('dish_name')}' tiene peso inválido (<=0): {weight} para '{ingredient_name}'. Intento {i}.")
                                     break
                             except (ValueError, TypeError):
                                  dish_valid = False
                                  print(f"[WARN] Plato '{dish.get('dish_name')}' tiene peso no numérico: '{dish['weights_g'][ing_idx]}' para '{ingredient_name}'. Intento {i}.")
                                  break

                    if not dish_valid:
                         all_dishes_valid = False
                         break # Salir del bucle de platos

                if all_dishes_valid:
                    print(f"[INFO] Gemini devolvió una respuesta JSON válida y verificada en intento {i}.")
                    return json.dumps(data)
                else:
                      print(f"[WARN] Respuesta JSON con platos inválidos en intento {i}. Reintentando...")

            else:
                print(f"[WARN] Estructura JSON principal inválida en intento {i}. Respuesta: '{clean}'. Reintentando...")

        except json.JSONDecodeError:
            print(f"[WARN] Respuesta de generación no es JSON válido en intento {i}: '{clean}'. Reintentando...")
        except Exception as e:
            error_details = str(e)
            # if hasattr(e, 'message'): error_details = e.message
            # if hasattr(e, 'details'): error_details += f" Details: {e.details()}"
            print(f"[ERROR] Error inesperado al llamar a Gemini o procesar respuesta en intento {i}: {error_details}")


        time.sleep(3) # Pausa un poco más larga para generación

    # Si todos los intentos fallan
    raise RuntimeError(f"Gemini no devolvió un JSON válido y correcto tras {max_retries} intentos.")


# --- Función Principal ---
def main():
    """Función principal del script."""
    print("-" * 41)
    print("   Generador de Dietas Basado en IA")
    print("-" * 41)

    # Verificar si la API está configurada ANTES de continuar
    if not is_gemini_api_configured():
        print("\n[FATAL ERROR] La API de Gemini no pudo ser configurada.")
        print("Verifica la API Key (en entorno o código) y los mensajes de error anteriores.")
        sys.exit("API Key no configurada o inválida.")

    print("\nElige una opción:")
    print("  1: Generar platos balanceados usando IA (inspirado en 'platos.csv')")
    print("  2: Mostrar platos predefinidos de 'platos.csv'")

    try:
        op = int(input("Opción [1]: ").strip() or "1")
    except ValueError:
        print("Opción inválida. Saliendo.")
        return

    # --- Opción 1: Generación con IA ---
    if op == 1:
        ingredientes_file = "ingredientes2.csv"
        platos_ref_file = "platos.csv"

        print(f"\n[INFO] Cargando ingredientes desde '{ingredientes_file}'...")
        df_ingredientes, cols_numericas = cargar_ingredientes(ingredientes_file)
        if df_ingredientes.empty:
            print(f"[ERROR] No se cargaron ingredientes válidos desde '{ingredientes_file}'.")
            sys.exit(1)
        print(f"[INFO] Ingredientes cargados: {len(df_ingredientes)} filas.")

        print(f"[INFO] Cargando platos de referencia desde '{platos_ref_file}'...")
        try:
            # Intentar leer con diferentes codificaciones
            try:
                df_platos_ref = pd.read_csv(platos_ref_file)
            except UnicodeDecodeError:
                print(f"[WARN] Falló lectura default, intentando con 'latin1' para {platos_ref_file}")
                try:
                    df_platos_ref = pd.read_csv(platos_ref_file, encoding='latin1')
                except UnicodeDecodeError:
                     print(f"[WARN] Falló lectura latin1, intentando con 'iso-8859-1' para {platos_ref_file}")
                     df_platos_ref = pd.read_csv(platos_ref_file, encoding='iso-8859-1')

            if 'NOMBRE DEL ALIMENTO' not in df_platos_ref.columns:
                 print(f"[ERROR] '{platos_ref_file}' debe tener la columna 'NOMBRE DEL ALIMENTO'.")
                 sys.exit(1)
            df_platos_ref = df_platos_ref.dropna(subset=['NOMBRE DEL ALIMENTO'])
            df_platos_ref = df_platos_ref[df_platos_ref['NOMBRE DEL ALIMENTO'].str.strip() != '']
            if df_platos_ref.empty:
                 print(f"[ERROR] No se encontraron nombres de platos válidos en '{platos_ref_file}'.")
                 sys.exit(1)
            print(f"[INFO] Platos de referencia cargados: {len(df_platos_ref)} filas.")
        except FileNotFoundError:
            print(f"[ERROR] Archivo de platos de referencia '{platos_ref_file}' no encontrado.")
            sys.exit(1)
        except Exception as e:
            print(f"[ERROR] Error al cargar platos de referencia: {e}")
            sys.exit(1)

        # --- Bucle para encontrar plato + ingredientes ---
        prototipos_finales = None
        plato_inspiracion = None
        max_intentos_seleccion = 10

        for intento in range(1, max_intentos_seleccion + 1):
            print(f"\n--- Intento de Selección {intento}/{max_intentos_seleccion} ---")
            if df_platos_ref.empty:
                print("[ERROR] No hay platos de referencia disponibles.")
                break
            plato_objetivo_row = df_platos_ref.sample(1).iloc[0]
            target_dish_name = plato_objetivo_row['NOMBRE DEL ALIMENTO'].strip()
            print(f"[INFO] Plato de inspiración seleccionado: '{target_dish_name}'")

            sugerencias = ask_gemini_to_suggest_ingredients(target_dish_name, df_ingredientes)

            if sugerencias is None: continue
            if not sugerencias:
                print(f"[INFO] Gemini no sugirió ingredientes para '{target_dish_name}'. Intentando otro plato...")
                continue

            # Crear prototipos
            protos_temp = []
            added_prototype_names_norm = set()
            print("[INFO] Construyendo prototipos basados en sugerencias...")
            for nombre_sugerido in sugerencias:
                nombre_sugerido_norm = nombre_sugerido.strip().lower()
                match_exact = df_ingredientes[df_ingredientes['NOMBRE_NORMALIZADO'] == nombre_sugerido_norm]
                if not match_exact.empty:
                    if nombre_sugerido_norm not in added_prototype_names_norm:
                        row = match_exact.iloc[0]
                        try:
                            # Validar datos numéricos aquí también
                            energy = float(row.get('Energía (kcal)', 0))
                            protein = float(row.get('Proteínas totales (g)', 0))
                            fat = float(row.get('Grasa total (g)', 0))
                            carbs = float(row.get('Carbohidratos disponibles (g)', 0))

                            protos_temp.append({
                                'name': row['NOMBRE DEL ALIMENTO'],
                                'energy': energy, 'protein': protein,
                                'fat': fat, 'carbs': carbs
                            })
                            added_prototype_names_norm.add(nombre_sugerido_norm)
                            print(f"  - Prototipo añadido: {row['NOMBRE DEL ALIMENTO']}")
                        except (ValueError, TypeError, KeyError) as e:
                             print(f"[WARN] Error datos prototipo '{nombre_sugerido}': {e}. Omitiendo.")
                else:
                     print(f"[WARN] Ingrediente sugerido '{nombre_sugerido}' no encontrado post-validación(?). Omitiendo.")

            # Verificar número de prototipos
            if len(protos_temp) >= 3:
                print(f"[SUCCESS] Prototipos válidos (>=3) creados para '{target_dish_name}'.")
                prototipos_finales = protos_temp
                plato_inspiracion = target_dish_name
                break # Éxito
            else:
                print(f"[INFO] No se obtuvieron suficientes prototipos válidos ({len(protos_temp)} < 3). Intentando otro plato...")


        # --- Fin bucle selección ---
        if not prototipos_finales:
            print(f"\n[ERROR] No se pudo generar una lista de prototipos válida tras {max_intentos_seleccion} intentos.")
            sys.exit(1)

        print(f"\n[INFO] Prototipos finales (basados en '{plato_inspiracion}') para generar la dieta:")
        for p in prototipos_finales:
            print(f"  - {p['name']} (E: {p['energy']:.0f} kcal, P: {p['protein']:.1f}g, G: {p['fat']:.1f}g, C: {p['carbs']:.1f}g)")

        # --- Pedir num platos y definir objetivos ---
        try:
            num_platos_generar = int(input(f"\n¿Cuántos platos generar basados en estos prototipos? [3]: ").strip() or 3)
            if num_platos_generar <= 0: num_platos_generar = 3
        except ValueError:
            num_platos_generar = 3

        target_nutrition = {
            'Calorías':      (600, 850),
            'Carbohidratos': (40, 60), 'Proteínas': (15, 30), 'Grasas': (20, 35)
        }
        print("\n[INFO] Objetivos nutricionales por plato:")
        print(f"  - Calorías: {target_nutrition['Calorías'][0]}-{target_nutrition['Calorías'][1]} kcal")
        print(f"  - % Carbs:   {target_nutrition['Carbohidratos'][0]}-{target_nutrition['Carbohidratos'][1]}%")
        print(f"  - % Prot:    {target_nutrition['Proteínas'][0]}-{target_nutrition['Proteínas'][1]}%")
        print(f"  - % Grasas:  {target_nutrition['Grasas'][0]}-{target_nutrition['Grasas'][1]}%")

        # --- Generar platos específicos ---
        print(f"\n[INFO] Pidiendo a Gemini que genere {num_platos_generar} platos...")
        try:
            gemini_json_output = ask_gemini_to_select(prototipos_finales, num_platos_generar, target_nutrition)
            generated_data = json.loads(gemini_json_output)
        except (RuntimeError, ValueError, json.JSONDecodeError) as e:
            print(f"\n[ERROR] Gemini no pudo generar los platos o la respuesta fue inválida: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"\n[ERROR] Error inesperado durante la generación de platos: {e}")
            sys.exit(1)

        # --- Procesar y mostrar platos generados ---
        platos_generados = generated_data.get('dishes', [])
        if not platos_generados:
            print("\n[INFO] Gemini no generó ningún plato que cumpliera las condiciones.")
        else:
            print(f"\n--- Platos Generados por IA ({len(platos_generados)}) ---")
            print(f"--- (Inspirados en '{plato_inspiracion}') ---")
            for i, dish_info in enumerate(platos_generados):
                if not isinstance(dish_info, dict) or not all(k in dish_info for k in ['dish_name', 'ingredients', 'weights_g']):
                     print(f"\n[WARN] Plato #{i+1} recibido con formato incompleto. Saltando.")
                     continue

                dish_name = dish_info.get('dish_name', f'Plato Desconocido {i+1}')
                ingredients = dish_info.get('ingredients', [])
                weights = dish_info.get('weights_g', [])

                if not ingredients or not weights or len(ingredients) != len(weights):
                    print(f"\n[WARN] Plato '{dish_name}' con listas inconsistentes. Saltando.")
                    continue

                # Crear selección para cálculo, validando
                selection_for_calc = []
                valid_items = True
                for name, weight in zip(ingredients, weights):
                     try:
                         num_weight = float(weight)
                         if isinstance(name, str) and name.strip() != "" and num_weight >= 0: # Permitir 0g
                              selection_for_calc.append({'name': name.strip(), 'grams': num_weight})
                         else:
                              print(f"[WARN] Item inválido en '{dish_name}': N='{name}', P='{weight}'. Omitiendo.")
                              valid_items = False
                     except (ValueError, TypeError):
                          print(f"[WARN] Peso no numérico ('{weight}') en '{dish_name}' para '{name}'. Omitiendo.")
                          valid_items = False

                if not selection_for_calc:
                     print(f"[WARN] Plato '{dish_name}' sin ingredientes válidos. Saltando cálculo.")
                     continue
                elif not valid_items:
                     print(f"[WARN] Se omitieron items inválidos en '{dish_name}'.")

                print(f"\n plato {i+1}: {dish_name.upper()}")
                print("  Ingredientes y Cantidades (según IA):")
                for item in selection_for_calc:
                    print(f"    - {item['name']}: {item['grams']:.1f} g")

                # Calcular nutrición
                print("  Calculando nutrición basada en datos locales...")
                try:
                    calculated_totals = calcular_totales_gemini(df_ingredientes, selection_for_calc)
                    total_calories = calculated_totals.get('Calorías', 0.0)
                    if total_calories > 0:
                        pc = (calculated_totals.get('Carbohidratos', 0.0) * 4 / total_calories * 100)
                        pp = (calculated_totals.get('Proteínas', 0.0) * 4 / total_calories * 100)
                        pf = (calculated_totals.get('Grasas', 0.0) * 9 / total_calories * 100)
                    else:
                        pc = pp = pf = 0
                        print("  [WARN] Calorías totales calculadas <= 0.")

                    # Mostrar resultados
                    print(f"  Nutrición Calculada (Estimada):")
                    print(f"    - Energía:       {total_calories:.1f} kcal")
                    print(f"    - Carbohidratos: {calculated_totals.get('Carbohidratos', 0.0):.1f} g ({pc:.1f}%)")
                    print(f"    - Proteínas:     {calculated_totals.get('Proteínas', 0.0):.1f} g ({pp:.1f}%)")
                    print(f"    - Grasas:        {calculated_totals.get('Grasas', 0.0):.1f} g ({pf:.1f}%)")

                    # Comparar con objetivos
                    print(f"  Cumplimiento de Objetivos:")
                    if total_calories > 0:
                         cal_ok = target_nutrition['Calorías'][0] <= total_calories <= target_nutrition['Calorías'][1]
                         pc_ok = target_nutrition['Carbohidratos'][0] <= pc <= target_nutrition['Carbohidratos'][1]
                         pp_ok = target_nutrition['Proteínas'][0] <= pp <= target_nutrition['Proteínas'][1]
                         pf_ok = target_nutrition['Grasas'][0] <= pf <= target_nutrition['Grasas'][1]
                         print(f"    - Calorías: {'OK' if cal_ok else 'FUERA'} ({target_nutrition['Calorías'][0]}-{target_nutrition['Calorías'][1]})")
                         print(f"    - % Carbs:  {'OK' if pc_ok else 'FUERA'} ({target_nutrition['Carbohidratos'][0]}-{target_nutrition['Carbohidratos'][1]})")
                         print(f"    - % Prot:   {'OK' if pp_ok else 'FUERA'} ({target_nutrition['Proteínas'][0]}-{target_nutrition['Proteínas'][1]})")
                         print(f"    - % Grasas: {'OK' if pf_ok else 'FUERA'} ({target_nutrition['Grasas'][0]}-{target_nutrition['Grasas'][1]})")
                    else:
                         print("    - No se puede verificar cumplimiento (Calorías <= 0).")

                except Exception as e:
                     print(f"  [ERROR] Error inesperado calculando nutrición para '{dish_name}': {e}")


    # --- Opción 2: Platos Predefinidos ---
    elif op == 2:
        platos_file = "platos.csv"
        print(f"\n[INFO] Mostrando platos predefinidos desde '{platos_file}'...")
        try:
             num_platos_mostrar = int(input(f"¿Cuántos platos predefinidos mostrar? [3]: ").strip() or 3)
             if num_platos_mostrar <= 0 : num_platos_mostrar = 3
        except ValueError:
             num_platos_mostrar = 3

        platos_predefinidos = generar_platos_completos(platos_file, num=num_platos_mostrar)

        if not platos_predefinidos:
            print(f"\nNo se encontraron platos válidos en '{platos_file}' o archivo no existe/mal formateado.")
        else:
            print(f"\n--- {len(platos_predefinidos)} Platos Predefinidos (Muestra Aleatoria de '{platos_file}') ---")
            for i, p in enumerate(platos_predefinidos):
                print(f"\n Plato {i+1}: {p['Plato'].upper()}")
                print(f"   - Energía:       {p['Energía']:.1f} kcal")
                print(f"   - Carbohidratos: {p['Carbohidratos']:.1f} g ({p['Porcentajes']['Carbohidratos']:.1f}%)")
                print(f"   - Proteínas:     {p['Proteínas']:.1f} g ({p['Porcentajes']['Proteínas']:.1f}%)")
                print(f"   - Grasas:        {p['Grasas']:.1f} g ({p['Porcentajes']['Grasas']:.1f}%)")

    # --- Opción no válida ---
    else:
        print("Opción no válida.")

    print("\n" + "-" * 41)
    print("         Ejecución Finalizada")
    print("-" * 41)


# --- Punto de Entrada Principal del Script ---
if __name__ == "__main__":
    # --- CONFIGURACIÓN API KEY ---
    # Intenta cargar desde variable de entorno primero (MÁS SEGURO)
    api_key_env = os.getenv("GOOGLE_API_KEY") or os.getenv("GENAI_API_KEY")
    api_key_direct = "AIzaSyDZufC18lhePzVnIN7cJRWzcOVX2H-5mDw" # Clave directa solo si no hay de entorno

    if not api_key_env:
        # --- ¡¡¡ ADVERTENCIA DE SEGURIDAD !!! ---
        # Si NO está en variable de entorno, usa la clave directamente aquí.
        # Esto es MUY INSEGURO si compartes el código. Úsalo bajo tu propio riesgo.
        print("[WARN] API Key no encontrada en variables de entorno.")
        print("[WARN] Usando clave directamente desde el código (¡CUIDADO! ¡Inseguro!).")
        # --- TU API KEY ESTÁ INCRUSTADA AQUÍ ---
        api_key_direct = "AIzaSyDZufC18lhePzVnIN7cJRWzcOVX2H-5mDw" # TU CLAVE PUESTA AQUÍ
    else:
        print("[INFO] Usando API Key desde variable de entorno.")


    # Intentar configurar la API con la clave obtenida (sea de entorno o directa)
    key_to_use = api_key_env or api_key_direct
    if not configure_gemini_api(api_key=key_to_use):
        # Si configure_gemini_api falló, ya imprimió el error. Salimos.
        sys.exit("Fallo crítico al configurar la API Key.")
    else:
        # Si la configuración fue exitosa (o al menos no falló inmediatamente),
        # proceder a ejecutar la lógica principal.
        main()