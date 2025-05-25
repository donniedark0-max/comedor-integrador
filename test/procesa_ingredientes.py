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
from dotenv import load_dotenv # Importar para cargar el .env

# --- Funciones Auxiliares y de Procesamiento ---

def cargar_ingredientes(filepath):
    """Carga los ingredientes desde un CSV y preprocesa los datos numéricos."""
    if not filepath:
        print("[ERROR] La ruta al archivo de ingredientes no fue proporcionada.")
        return pd.DataFrame(), []
    if not os.path.exists(filepath):
        print(f"[ERROR] Archivo de ingredientes no encontrado en la ruta especificada: {filepath}")
        return pd.DataFrame(), []
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

    except FileNotFoundError: # Esta excepción ya está cubierta por el os.path.exists de arriba, pero se mantiene por robustez.
        print(f"[ERROR] Archivo de ingredientes no encontrado: {filepath}")
        return pd.DataFrame(), []
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
    if not platos_csv:
        print("[ERROR] La ruta al archivo de platos predefinidos no fue proporcionada.")
        return []
    if not os.path.exists(platos_csv):
        print(f"[ERROR] Archivo de platos predefinidos no encontrado en la ruta especificada: {platos_csv}")
        return []
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
                'Proteínas': (P * 4 / E * 100),
                'Grasas': (F * 9 / E * 100)
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

    key_to_use = api_key or os.getenv("GENAI_API_KEY") # Prioriza GENAI_API_KEY como en el .env

    if not key_to_use: # Si GENAI_API_KEY no está, prueba con GOOGLE_API_KEY
        key_to_use = os.getenv("GOOGLE_API_KEY")

    if key_to_use:
        try:
            genai.configure(api_key=key_to_use)
            __gemini_api_configured = True
            print("[INFO] API Key de Gemini configurada exitosamente.")
            return True
        except Exception as e:
            print(f"[ERROR] Falló la configuración de la API Key de Gemini: {e}")
            __gemini_api_configured = False
            return False
    else:
        print("[ERROR] No se proporcionó API Key (GENAI_API_KEY o GOOGLE_API_KEY) en el archivo .env o como argumento.")
        __gemini_api_configured = False
        return False

def is_gemini_api_configured():
    """Verifica si la API de Gemini fue configurada exitosamente."""
    return __gemini_api_configured


def ask_gemini_to_suggest_ingredients(target_dish_name, available_ingredients_df, max_retries=3):
    """Pide a Gemini ingredientes clave para un plato, usando solo los disponibles."""
    if not is_gemini_api_configured():
        print("[ERROR] La API de Gemini no está configurada. No se puede continuar.")
        return None 

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
    # Manejo para evitar error si 'NOMBRE_NORMALIZADO' no fuera único y se quisiera el último, aunque drop_duplicates ya lo maneja.
    # Por simplicidad y dado el preprocesamiento, asumimos que el mapeo es consistente.
    norm_to_original_map = pd.Series(
        available_ingredients_df.drop_duplicates(subset=['NOMBRE_NORMALIZADO'], keep='first')['NOMBRE DEL ALIMENTO'].values,
        index=available_ingredients_df.drop_duplicates(subset=['NOMBRE_NORMALIZADO'], keep='first')['NOMBRE_NORMALIZADO']
    ).to_dict()


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

            if not resp.parts:
                feedback = getattr(resp, 'prompt_feedback', None)
                block_reason = getattr(feedback, 'block_reason', 'Razón desconocida') if feedback else 'Razón desconocida'
                print(f"[WARN] La respuesta de Gemini fue bloqueada o vacía en intento {i}. Razón: {block_reason}")
                time.sleep(2)
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

            if isinstance(data, dict) and 'suggested_ingredients' in data and isinstance(data['suggested_ingredients'], list):
                suggested_list = data['suggested_ingredients']
                if not suggested_list:
                    print(f"[INFO] Gemini no sugirió ingredientes de la lista para '{target_dish_name}'.")
                    return [] 

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
            error_details = str(e)
            print(f"[ERROR] Error inesperado llamando a Gemini para sugerir ingredientes en intento {i}/{max_retries}: {error_details}")


        time.sleep(2) 

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

    valid_prototypes = []
    required_keys = ['name', 'energy', 'protein', 'fat', 'carbs']
    for p in prototypes:
        if isinstance(p, dict) and all(k in p for k in required_keys):
            try:
                # Validar que los valores nutricionales sean convertibles a float
                {k: float(p[k]) for k in required_keys if k != 'name'}
                valid_prototypes.append(p)
            except (ValueError, TypeError):
                print(f"[WARN] Prototipo '{p.get('name', 'Desconocido')}' tiene valores no numéricos y será omitido.")
        else:
            print(f"[WARN] Prototipo con formato inválido omitido: {p}")

    if not valid_prototypes:
        print("[ERROR] No quedaron prototipos válidos después del filtrado.")
        raise ValueError("No hay prototipos válidos para enviar a Gemini.")

    prototype_names = [p['name'] for p in valid_prototypes] 
    prototype_names_set = set(prototype_names)

    prompt = (
        "Eres un chef culinario y nutricionista altamente creativo y experto en gastronomía mundial. Tu tarea es diseñar recetas para platos específicos.\n"
        "Dispones de los siguientes ingredientes base (prototipos), con su información nutricional por 100g:\n"
        f"```json\n{json.dumps(valid_prototypes, ensure_ascii=False, indent=2)}\n```\n\n"
        f"Debes generar exactamente {num_dishes} recetas distintas para platos REALES y conocidos. ¡No inventes nombres de platos!\n"
        "Para CADA plato generado, sigue estas reglas ESTRICTAMENTE:\n"
        f"1. **Nombre del Plato ('dish_name'):** Asigna un nombre CULINARIO específico y reconocible (ej. 'Lomo Saltado', 'Paella de Mariscos', 'Ensalada César con Pollo'). El nombre debe reflejar una preparación o receta conocida.\n"
        f"2. **Selección de Ingredientes ('ingredients'):** Elige entre 3 y 7 ingredientes de la lista de prototipos proporcionada ({', '.join(prototype_names)}). Los ingredientes seleccionados deben ser CARACTERÍSTICOS y ESENCIALES para el plato que nombraste. NO uses ingredientes que no estén en la lista de prototipos.\n"
        "   Asegúrate de que los nombres de los ingredientes en tu respuesta coincidan EXACTAMENTE con los nombres de los prototipos.\n"
        "3. **Cantidades ('weights_g'):** Especifica las cantidades EN GRAMOS para cada ingrediente seleccionado. Estas cantidades deben ser realistas para una porción individual del plato y deben ajustarse para que el plato TOTAL cumpla los siguientes objetivos nutricionales:\n"
        f"   - Energía Total: {target['Calorías'][0]} – {target['Calorías'][1]} kcal\n"
        f"   - % Energía de Carbohidratos: {target['Carbohidratos'][0]}% – {target['Carbohidratos'][1]}%\n"
        f"   - % Energía de Proteínas: {target['Proteínas'][0]}% – {target['Proteínas'][1]}%\n"
        f"   - % Energía de Grasas: {target['Grasas'][0]}% – {target['Grasas'][1]}%\n"
        "4. **Coherencia:** El plato nombrado y los ingredientes seleccionados deben tener una relación culinaria lógica y común. Por ejemplo, si nombras 'Sopa de Tomate', los ingredientes deben incluir 'Tomate' y otros elementos típicos de esa sopa de la lista de prototipos.\n\n"
        "Responde ÚNICAMENTE con un objeto JSON válido que contenga una lista llamada 'dishes'. Cada elemento de la lista debe ser un objeto con las claves: 'dish_name' (string), 'ingredients' (lista de strings EXACTAMENTE como en los prototipos), y 'weights_g' (lista de números positivos).\n"
        "Ejemplo de formato de respuesta JSON (asumiendo que prototipos como 'Pollo Fresco', 'Arroz Blanco Cocido', 'Cebolla Roja' están en la lista de prototipos):\n"
        "{\n"
        "  \"dishes\": [\n"
        "    {\n"
        "      \"dish_name\": \"Arroz con Pollo Simplificado\",\n"
        # Usar nombres de prototipos reales para el ejemplo si hay suficientes
        f"      \"ingredients\": [\"{prototype_names[0 % len(prototype_names)]}\", \"{prototype_names[1 % len(prototype_names) if len(prototype_names) > 1 else (prototype_names[0 % len(prototype_names)] if len(prototype_names) > 0 else 'Ingrediente Ejemplo 2')]}\", \"{prototype_names[2 % len(prototype_names) if len(prototype_names) > 2 else (prototype_names[0 % len(prototype_names)] if len(prototype_names) > 0 else 'Ingrediente Ejemplo 3')]}\"],\n"
        "      \"weights_g\": [120, 150, 30]\n"
        "    }\n"
        "    // ... (más platos si se pidieron)\n"
        "  ]\n"
        "}\n\n"
        "IMPORTANTE: Si consideras que con los prototipos disponibles y las restricciones nutricionales NO es posible crear platos que sean genuinamente reconocibles y culinariamente coherentes, o si no puedes cumplir TODAS las condiciones, devuelve un JSON con una lista de platos vacía: {\"dishes\": []}. Prioriza la calidad y coherencia culinaria sobre la cantidad de platos generados si las restricciones son demasiado difíciles de cumplir."
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
                block_reason = getattr(feedback, 'block_reason', 'Razón desconocida') if feedback else 'Razón desconocida'
                print(f"[WARN] La respuesta de Gemini fue bloqueada o vacía en intento {i}. Razón: {block_reason}")
                time.sleep(3) 
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
                    return json.dumps(data) 

                for dish_idx, dish in enumerate(data['dishes']):
                    dish_valid = True
                    if not (isinstance(dish, dict) and
                            all(k in dish for k in ['dish_name', 'ingredients', 'weights_g']) and
                            isinstance(dish['dish_name'], str) and dish['dish_name'].strip() != "" and
                            isinstance(dish['ingredients'], list) and
                            isinstance(dish['weights_g'], list) and
                            len(dish['ingredients']) == len(dish['weights_g']) and
                            3 <= len(dish['ingredients']) <= 7):
                        dish_valid = False
                        print(f"[WARN] Plato #{dish_idx+1} con formato/estructura/num_ingredientes inválido en intento {i}: {dish}")

                    if dish_valid:
                        for ing_idx, ingredient_name in enumerate(dish['ingredients']):
                            if not isinstance(ingredient_name, str) or ingredient_name not in prototype_names_set:
                                dish_valid = False
                                print(f"[WARN] Plato '{dish.get('dish_name', 'Desconocido')}' usa ingrediente inválido o no solicitado: '{ingredient_name}'. Permitidos: {list(prototype_names_set)}. Intento {i}.")
                                break
                            try:
                                weight = float(dish['weights_g'][ing_idx])
                                if weight <= 0: 
                                    dish_valid = False
                                    print(f"[WARN] Plato '{dish.get('dish_name', 'Desconocido')}' tiene peso inválido (<=0): {weight} para '{ingredient_name}'. Intento {i}.")
                                    break
                            except (ValueError, TypeError):
                                dish_valid = False
                                print(f"[WARN] Plato '{dish.get('dish_name', 'Desconocido')}' tiene peso no numérico: '{dish['weights_g'][ing_idx]}' para '{ingredient_name}'. Intento {i}.")
                                break

                    if not dish_valid:
                        all_dishes_valid = False
                        break 

                if all_dishes_valid:
                    print(f"[INFO] Gemini devolvió una respuesta JSON válida y verificada en intento {i}/{max_retries}.")
                    return json.dumps(data) 
                else:
                    print(f"[WARN] Uno o más platos en la respuesta de Gemini no pasaron la validación en intento {i}/{max_retries}. Reintentando...")

            else:
                print(f"[WARN] Respuesta de generación no tiene la estructura JSON esperada en intento {i}/{max_retries}: '{clean}'. Reintentando...")

        except json.JSONDecodeError:
            print(f"[WARN] Respuesta de generación no es JSON válido en intento {i}/{max_retries}: '{clean}'. Reintentando...")
        except Exception as e:
            error_details = str(e)
            print(f"[ERROR] Error inesperado llamando a Gemini para generar recetas en intento {i}/{max_retries}: {error_details}")

        time.sleep(3) 

    print(f"[ERROR] Gemini no pudo generar recetas válidas tras {max_retries} intentos.")
    return json.dumps({"dishes": []})


# --- Lógica Principal (Ejemplo de uso) ---
def main():
    # Cargar variables de entorno desde .env
    # load_dotenv() DEBE llamarse ANTES de acceder a os.getenv() para variables del .env
    # Si el script se ejecuta desde D:\Menus IA\comedor-integrador\test\
    # y el .env está en D:\Menus IA\comedor-integrador\.env
    # necesitamos especificar la ruta al .env o asegurar que el script se corre desde la raíz del proyecto.
    # Por defecto, load_dotenv busca en el directorio actual y subiendo.
    # Si ejecutas `python test/procesa_ingredientes.py` desde `D:\Menus IA\comedor-integrador\`,
    # el .env en `D:\Menus IA\comedor-integrador\` será encontrado.
    dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
        print(f"[INFO] Archivo .env cargado desde: {dotenv_path}")
    else:
        # Intentar cargar .env desde el directorio actual (si se ejecuta desde la raíz)
        if load_dotenv():
            print("[INFO] Archivo .env cargado desde el directorio actual.")
        else:
            print("[WARN] Archivo .env no encontrado. Asegúrate de que exista en la raíz del proyecto 'D:\\Menus IA\\comedor-integrador\\.env' o que las variables de entorno estén configuradas globalmente.")


    print("--- Iniciando Generador de Dietas ---")

    # --- Configuración de API Key ---
    if not configure_gemini_api(): # La API Key se lee de GENAI_API_KEY (del .env) dentro de esta función
        print("[WARN] La API de Gemini no se pudo configurar. La Opción 1 (Generación IA) no estará disponible.")

    # --- Carga de Datos desde rutas del .env ---
    # Las rutas en .env son relativas al directorio raíz del proyecto (donde está .env)
    # Por ejemplo: INGREDIENTES_CSV=./test/ingredientes2.csv
    # os.getenv() devolverá esa cadena. Si el script se ejecuta desde la raíz del proyecto,
    # la ruta relativa funcionará. Si se ejecuta desde otra parte, necesitamos normalizarla.
    
    project_root = os.path.dirname(dotenv_path) # Asumimos que .env está en la raíz

    ingredients_filepath_rel = os.getenv('INGREDIENTES_CSV')
    platos_filepath_rel = os.getenv('PLATOS_CSV')

    if not ingredients_filepath_rel:
        print("[ERROR] La variable de entorno INGREDIENTES_CSV no está definida en tu .env.")
        ingredients_filepath = None
    else:
        ingredients_filepath = os.path.abspath(os.path.join(project_root, ingredients_filepath_rel))
        print(f"[INFO] Usando path para ingredientes (desde .env): {ingredients_filepath}")


    if not platos_filepath_rel:
        print("[ERROR] La variable de entorno PLATOS_CSV no está definida en tu .env.")
        platos_filepath = None
    else:
        platos_filepath = os.path.abspath(os.path.join(project_root, platos_filepath_rel))
        print(f"[INFO] Usando path para platos (desde .env): {platos_filepath}")


    df_ingredientes_db, numeric_cols_db = cargar_ingredientes(ingredients_filepath)

    if df_ingredientes_db.empty:
        print("[ERROR] No se pudieron cargar los ingredientes de la base de datos local. Revisa la ruta y el archivo.")
        # No terminar aquí necesariamente, la opción 2 podría funcionar si platos_filepath es válido.
    else:
        print(f"[INFO] Ingredientes cargados de '{ingredients_filepath}'. Total: {len(df_ingredientes_db)}")


    # --- Definición de Objetivos Nutricionales ---
    objetivos_nutricionales = {
        'Calorías': [350, 650], 
        'Carbohidratos': [40, 60], 
        'Proteínas': [20, 35], 
        'Grasas': [20, 35] 
    }
    print(f"\n[INFO] Objetivos nutricionales para cada plato:")
    for k, v in objetivos_nutricionales.items():
        unit = "%" if k != 'Calorías' else "kcal"
        print(f"  - {k}: {v[0]} - {v[1]} {unit}")


    # --- Menú de Opciones ---
    print("\n--- Opciones de Generación de Platos ---")
    print("1. Generar platos con IA (Gemini) basados en ingredientes disponibles y objetivos.")
    print("2. Seleccionar platos aleatorios de una lista predefinida (CSV).")

    choice = input("Elige una opción (1 o 2): ")

    if choice == '1':
        print("\n--- Opción 1: Generación con IA ---")
        if not is_gemini_api_configured():
            print("[ERROR] La Opción 1 no está disponible porque la API de Gemini no está configurada.")
            return

        if df_ingredientes_db.empty:
            print("[ERROR] No hay ingredientes cargados de la base de datos para la Opción 1.")
            return
        
        num_prototipos_para_gemini = min(50, len(df_ingredientes_db)) 
        if num_prototipos_para_gemini < 5: 
            print(f"[ERROR] No hay suficientes ingredientes ({num_prototipos_para_gemini}) en la BD para usar como prototipos para Gemini. Se necesitan al menos 5.")
            return

        df_prototipos = df_ingredientes_db.sample(n=num_prototipos_para_gemini, random_state=random.randint(1,1000))

        prototipos_gemini = []
        for _, row in df_prototipos.iterrows():
            try:
                prototipos_gemini.append({
                    "name": row['NOMBRE DEL ALIMENTO'],
                    "energy": float(row['Energía (kcal)']),
                    "protein": float(row['Proteínas totales (g)']),
                    "fat": float(row['Grasa total (g)']),
                    "carbs": float(row['Carbohidratos disponibles (g)'])
                })
            except (KeyError, ValueError) as e:
                print(f"[WARN] Omitiendo prototipo '{row.get('NOMBRE DEL ALIMENTO', 'Desconocido')}' por datos faltantes/inválidos: {e}")
                continue

        if len(prototipos_gemini) < 3: 
             print(f"[ERROR] No hay suficientes prototipos válidos ({len(prototipos_gemini)}) después del filtrado. Se necesitan al menos 3.")
             return

        print(f"\n[INFO] Usando {len(prototipos_gemini)} ingredientes de la BD como prototipos para Gemini.")

        num_platos_a_generar_ia = 3
        try:
            print(f"[INFO] Pidiendo a Gemini que genere {num_platos_a_generar_ia} platos...")
            respuesta_gemini_json_str = ask_gemini_to_select(
                prototipos_gemini,
                num_platos_a_generar_ia,
                objetivos_nutricionales
            )
            respuesta_gemini = json.loads(respuesta_gemini_json_str) 
        except ValueError as ve: 
            print(f"[ERROR] No se pudo generar platos con Gemini: {ve}")
            return
        except Exception as e:
            print(f"[ERROR] Ocurrió un error inesperado durante la generación con Gemini: {e}")
            return


        if respuesta_gemini and 'dishes' in respuesta_gemini and respuesta_gemini['dishes']:
            print("\n--- Platos Generados por IA ---")
            for i, plato_info in enumerate(respuesta_gemini['dishes']):
                nombre_plato = plato_info.get('dish_name', f'Plato Desconocido {i+1}')
                ingredientes_receta = plato_info.get('ingredients', [])
                pesos_receta = plato_info.get('weights_g', [])

                print(f"\n{i+1}. Plato: {nombre_plato}")
                print(f"   Ingredientes y Cantidades (según IA):")
                selection_para_calculo = []
                for ing_name, ing_weight in zip(ingredientes_receta, pesos_receta):
                    print(f"     - {ing_name}: {ing_weight:.1f} g")
                    selection_para_calculo.append({'name': ing_name, 'grams': ing_weight})

                print(f"   Calculando nutrición para '{nombre_plato}' con BD local...")
                totales_calculados = calcular_totales_gemini(df_ingredientes_db, selection_para_calculo)

                if totales_calculados['Calorías'] > 0:
                    perc_C = (totales_calculados['Carbohidratos'] * 4 / totales_calculados['Calorías']) * 100
                    perc_P = (totales_calculados['Proteínas'] * 4 / totales_calculados['Calorías']) * 100
                    perc_F = (totales_calculados['Grasas'] * 9 / totales_calculados['Calorías']) * 100
                    print(f"   Nutrición Calculada (Total):")
                    print(f"     - Energía: {totales_calculados['Calorías']:.1f} kcal")
                    print(f"     - Carbohidratos: {totales_calculados['Carbohidratos']:.1f} g ({perc_C:.1f}%)")
                    print(f"     - Proteínas: {totales_calculados['Proteínas']:.1f} g ({perc_P:.1f}%)")
                    print(f"     - Grasas: {totales_calculados['Grasas']:.1f} g ({perc_F:.1f}%)")
                else:
                    print("     - No se pudo calcular la nutrición (0 kcal o ingredientes no encontrados).")
        else:
            print("\n[INFO] Gemini no generó platos o la respuesta no fue la esperada.")
            if respuesta_gemini and 'dishes' in respuesta_gemini and not respuesta_gemini['dishes']:
                print("[INFO] Esto puede significar que Gemini no encontró combinaciones que cumplieran todos los requisitos con los prototipos dados.")


    elif choice == '2':
        print("\n--- Opción 2: Platos Predefinidos de CSV ---")
        if not platos_filepath or not os.path.exists(platos_filepath):
            print(f"[ERROR] El archivo de platos predefinidos '{platos_filepath if platos_filepath else 'NO DEFINIDO EN .ENV'}' no existe o la ruta no es válida.")
            print("       Asegúrate de que la variable PLATOS_CSV en tu .env apunte a un archivo existente.")
            return

        platos_sugeridos = generar_platos_completos(platos_filepath, num=3)
        if platos_sugeridos:
            print("\n--- Platos Seleccionados Aleatoriamente ---")
            for i, plato in enumerate(platos_sugeridos):
                print(f"\n{i+1}. Plato: {plato['Plato']}")
                print(f"   Energía: {plato['Energía']:.1f} kcal")
                print(f"   Carbohidratos: {plato['Carbohidratos']:.1f} g ({plato['Porcentajes']['Carbohidratos']:.1f}%)")
                print(f"   Proteínas: {plato['Proteínas']:.1f} g ({plato['Porcentajes']['Proteínas']:.1f}%)")
                print(f"   Grasas: {plato['Grasas']:.1f} g ({plato['Porcentajes']['Grasas']:.1f}%)")
        else:
            print(f"No se pudieron generar platos desde '{platos_filepath}'. Revisa el archivo y los mensajes de error/advertencia.")
    else:
        print("Opción no válida.")

    print("\n--- Fin del Programa ---")

if __name__ == '__main__':
    if sys.stdout.encoding != 'utf-8' and hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
            print("[INFO] Reconfigurada la codificación de salida a UTF-8.")
        except Exception as e:
            print(f"[WARN] No se pudo reconfigurar la codificación de salida a UTF-8: {e}")

    main()