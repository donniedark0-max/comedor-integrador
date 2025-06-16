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
import random  # Necesario para elegir plato aleatorio
import time    # Para posibles reintentos con pausa
from dotenv import load_dotenv  # Importar para cargar el .env

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
                df = pd.read_csv(filepath, encoding='iso-8859-1')
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
    missing_numeric_cols = [col for col in numeric_cols if col not in df.columns]
    if missing_numeric_cols:
        print(f"[ERROR] Faltan columnas numéricas en '{filepath}': {missing_numeric_cols}")
        numeric_cols = [col for col in numeric_cols if col in df.columns]
        if not numeric_cols:
            print("[ERROR] No hay columnas numéricas válidas para procesar.")
            return pd.DataFrame(), []

    if 'NOMBRE DEL ALIMENTO' not in df.columns:
        print(f"[ERROR] Falta la columna 'NOMBRE DEL ALIMENTO' en '{filepath}'.")
        return pd.DataFrame(), []

    df[numeric_cols] = df[numeric_cols].apply(
        lambda col: pd.to_numeric(col.astype(str).str.replace(',', '.', regex=False), errors='coerce')
    )
    df[numeric_cols] = df[numeric_cols].fillna(0)
    df['NOMBRE_NORMALIZADO'] = df['NOMBRE DEL ALIMENTO'].str.strip().str.lower()
    df = df.dropna(subset=['NOMBRE_NORMALIZADO'])
    df = df[df['NOMBRE_NORMALIZADO'] != '']
    return df, numeric_cols

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
    if actual_n_clusters < 2:
        print("[WARN] No hay suficientes datos para formar clusters significativos (se necesita >= 2). Asignando todos a cluster 0.")
        df.loc[valid_data.index, 'Cluster'] = 0
        df['Cluster'] = df['Cluster'].fillna(-1)
        return {0: df[df.Cluster == 0]}, None, df

    X_scaled = scaler.fit_transform(valid_data)
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
    found_ingredients_details = []

    if not df_ingredientes_db['NOMBRE_NORMALIZADO'].is_unique:
        df_unique_norm = df_ingredientes_db.drop_duplicates(subset=['NOMBRE_NORMALIZADO'], keep='first')
        norm_to_original_name = pd.Series(df_unique_norm['NOMBRE DEL ALIMENTO'].values,
                                          index=df_unique_norm['NOMBRE_NORMALIZADO']).to_dict()
    else:
        norm_to_original_name = pd.Series(df_ingredientes_db['NOMBRE DEL ALIMENTO'].values,
                                          index=df_ingredientes_db['NOMBRE_NORMALIZADO']).to_dict()

    for item in selection:
        if 'name' not in item or 'grams' not in item:
            print(f"[WARN] Item inválido en selección: {item}. Saltando.")
            continue
        try:
            grams = float(item['grams'])
            if grams < 0:
                print(f"[WARN] Cantidad negativa ({grams}g) para {item['name']}. Saltando cálculo para este item.")
                continue
            ingredient_name_original = item['name']
        except (ValueError, TypeError):
            print(f"[WARN] Gramos no numéricos ('{item.get('grams')}') para {item.get('name', 'Desconocido')}. Saltando.")
            continue

        name_norm = ingredient_name_original.strip().lower()
        subset = df_ingredientes_db[df_ingredientes_db['NOMBRE_NORMALIZADO'] == name_norm]
        found_match = False
        row = None
        if not subset.empty:
            found_match = True
            row = subset.iloc[0]
            found_ingredients_details.append(f"'{ingredient_name_original}' ({grams:.1f}g)")

        if not found_match:
            all_normalized_names = df_ingredientes_db['NOMBRE_NORMALIZADO'].unique().tolist()
            matches = difflib.get_close_matches(name_norm, all_normalized_names, n=1, cutoff=0.85)
            if matches:
                subset = df_ingredientes_db[df_ingredientes_db['NOMBRE_NORMALIZADO'] == matches[0]]
                if not subset.empty:
                    row = subset.iloc[0]
                    original_name_found = row['NOMBRE DEL ALIMENTO']
                    print(f"[INFO] Ingrediente '{ingredient_name_original}' no encontrado exactamente, usando coincidencia cercana: '{original_name_found}'")
                    found_match = True
                    found_ingredients_details.append(f"'{ingredient_name_original}' (match: '{original_name_found}', {grams:.1f}g)")

            if not found_match:
                missing_ingredients.append(ingredient_name_original)
                print(f"[ERROR] No se encontró coincidencia exacta ni cercana para: '{ingredient_name_original}'")
                continue

        if found_match and row is not None:
            factor = grams / 100.0
            try:
                if 'Energía (kcal)' in row:
                    totals['Calorías'] += float(row['Energía (kcal)']) * factor
                if 'Carbohidratos disponibles (g)' in row:
                    totals['Carbohidratos'] += float(row['Carbohidratos disponibles (g)']) * factor
                if 'Proteínas totales (g)' in row:
                    totals['Proteínas'] += float(row['Proteínas totales (g)']) * factor
                if 'Grasa total (g)' in row:
                    totals['Grasas'] += float(row['Grasa total (g)']) * factor
            except (ValueError, TypeError, KeyError) as e:
                row_name = row.get('NOMBRE DEL ALIMENTO', ingredient_name_original)
                print(f"[WARN] Error al convertir datos nutricionales a número para '{row_name}'. Error: {e}. Sus valores no se sumarán.")
                if ingredient_name_original not in missing_ingredients:
                    missing_ingredients.append(f"{ingredient_name_original} (error de datos)")

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
        try:
            dfp = pd.read_csv(platos_csv)
        except UnicodeDecodeError:
            print(f"[WARN] Falló lectura con codificación default, intentando con 'latin1' para {platos_csv}")
            try:
                dfp = pd.read_csv(platos_csv, encoding='latin1')
            except UnicodeDecodeError:
                print(f"[WARN] Falló lectura con 'latin1', intentando con 'iso-8859-1' para {platos_csv}")
                dfp = pd.read_csv(platos_csv, encoding='iso-8859-1')
    except Exception as e:
        print(f"[ERROR] Error al leer '{platos_csv}': {e}")
        return []

    required_cols = ['NOMBRE DEL ALIMENTO', 'Energía (kcal)', 'Carbohidratos disponibles (g)', 'Proteínas totales (g)', 'Grasa total (g)']
    missing_cols = [col for col in required_cols if col not in dfp.columns]
    if missing_cols:
        print(f"[ERROR] Faltan columnas requeridas en {platos_csv}. Se necesitan: {missing_cols}")
        return []

    numeric_cols_platos = ['Energía (kcal)', 'Carbohidratos disponibles (g)', 'Proteínas totales (g)', 'Grasa total (g)']
    for col in numeric_cols_platos:
        if col in dfp.columns:
            dfp[col] = pd.to_numeric(dfp[col].astype(str).str.replace(',', '.', regex=False), errors='coerce')
    dfp = dfp.dropna(subset=numeric_cols_platos)
    if 'Energía (kcal)' in dfp.columns:
        dfp = dfp[dfp['Energía (kcal)'] > 0]
    if dfp.empty:
        print(f"[WARN] No quedan platos válidos en '{platos_csv}' después de la limpieza.")
        return []

    res = []
    num_to_sample = min(num, len(dfp))
    if num_to_sample < num:
        print(f"[WARN] Se pidieron {num} platos, pero solo hay {len(dfp)} válidos disponibles en {platos_csv}.")
    if num_to_sample == 0:
        return []

    try:
        sampled_dishes = dfp.sample(n=num_to_sample, random_state=random.randint(1, 1000))
    except ValueError:
        print(f"[WARN] No se pudieron seleccionar muestras de '{platos_csv}', podría estar vacío.")
        return []

    for _, row in sampled_dishes.iterrows():
        try:
            if not all(col in row for col in required_cols):
                print(f"[WARN] Fila incompleta en {platos_csv}, saltando: {row.get('NOMBRE DEL ALIMENTO', 'Fila sin nombre')}")
                continue

            E = float(row['Energía (kcal)'])
            C = float(row['Carbohidratos disponibles (g)'])
            P = float(row['Proteínas totales (g)'])
            F = float(row['Grasa total (g)'])
            percentages = {
                'Carbohidratos': (C * 4 / E * 100),
                'Proteínas':   (P * 4 / E * 100),
                'Grasas':      (F * 9 / E * 100)
            }
            res.append({
                'Plato': row['NOMBRE DEL ALIMENTO'],
                'Energía': E, 'Carbohidratos': C, 'Proteínas': P, 'Grasas': F,
                'Porcentajes': percentages
            })
        except Exception as e:
            print(f"[WARN] Error inesperado procesando fila del plato '{row.get('NOMBRE DEL ALIMENTO', 'Desconocido')}': {e}. Saltando.")
            continue
    return res

# --- Funciones de Interacción con Gemini ---

__gemini_api_configured = False

def configure_gemini_api(api_key=None):
    """Configura la API de Gemini una sola vez."""
    global __gemini_api_configured
    if __gemini_api_configured:
        return True
    key_to_use = api_key or os.getenv("GENAI_API_KEY") or os.getenv("GOOGLE_API_KEY")
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
        print("[ERROR] No se proporcionó API Key (GENAI_API_KEY o GOOGLE_API_KEY).")
        __gemini_api_configured = False
        return False

def is_gemini_api_configured():
    """Verifica si la API de Gemini fue configurada exitosamente."""
    return __gemini_api_configured

def ask_gemini_to_suggest_ingredients(target_dish_name, available_ingredients_df, max_retries=5):
    """Pide a Gemini ingredientes clave para un plato, asegurando afinidad (5 reintentos)."""
    if not is_gemini_api_configured():
        print("[ERROR] La API de Gemini no está configurada. No se puede continuar.")
        return None

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"[ERROR] No se pudo crear el modelo Gemini: {e}")
        return None

    available_names_original = available_ingredients_df['NOMBRE DEL ALIMENTO'].unique().tolist()
    if not available_names_original:
        print("[ERROR] La lista de ingredientes disponibles está vacía.")
        return None
    available_names_norm_set = set(available_ingredients_df['NOMBRE_NORMALIZADO'].unique())
    norm_to_original_map = pd.Series(
        available_ingredients_df.drop_duplicates(subset=['NOMBRE_NORMALIZADO'], keep='first')['NOMBRE DEL ALIMENTO'].values,
        index=available_ingredients_df.drop_duplicates(subset=['NOMBRE_NORMALIZADO'], keep='first')['NOMBRE_NORMALIZADO']
    ).to_dict()

    prompt = (
        f"Eres un asistente de cocina experto. El plato objetivo es '{target_dish_name}'.\n"
        "Debes elegir de 3 a 7 ingredientes de la lista siguiente, que sean auténticos y tengan **afinidad culinaria** clara.\n"
        f"Lista de ingredientes disponibles:\n```\n{', '.join(available_names_original)}\n```\n"
        "Si consideras que NO hay afinidad suficiente entre los ingredientes para ese plato, devuelve {\"suggested_ingredients\": []}.\n"
        "Responde SOLO con un JSON: {\"suggested_ingredients\":[...]}\n"
    )

    for i in range(1, max_retries + 1):
        print(f"[INFO] Intento {i}/{max_retries} para sugerir ingredientes...")
        try:
            resp = model.generate_content(prompt)
            text = resp.text or ""
            match = re.search(r'\{[\s\S]*\}', text)
            clean = match.group(0) if match else re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()
            data = json.loads(clean) if clean else {}
            if isinstance(data, dict) and 'suggested_ingredients' in data:
                return data['suggested_ingredients']
        except Exception as e:
            print(f"[WARN] Error en sugerencia: {e}")
        time.sleep(2)

    print(f"[ERROR] No se obtuvieron sugerencias válidas tras {max_retries} intentos.")
    return None

def ask_gemini_to_select(prototypes, num_dishes, target, max_retries=5):
    """Pide a Gemini que genere recetas específicas usando los prototipos (5 reintentos)."""
    if not is_gemini_api_configured():
        raise ValueError("API Key no configurada.")

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        raise ValueError(f"Fallo al crear modelo Gemini: {e}")

    if not prototypes:
        raise ValueError("No se pueden generar platos sin prototipos.")

    valid_prototypes = []
    required_keys = ['name', 'energy', 'protein', 'fat', 'carbs']
    for p in prototypes:
        if isinstance(p, dict) and all(k in p for k in required_keys):
            try:
                _ = float(p['energy']); _ = float(p['protein']); _ = float(p['fat']); _ = float(p['carbs'])
                valid_prototypes.append(p)
            except (ValueError, TypeError):
                continue
        else:
            continue

    if not valid_prototypes:
        raise ValueError("No hay prototipos válidos para enviar a Gemini.")

    prompt = (
        "Eres un chef y nutricionista experto. Debes crear recetas REALES y reconocibles usando SOLO los siguientes prototipos:\n"
        f"{json.dumps(valid_prototypes, ensure_ascii=False, indent=2)}\n\n"
        f"Genera EXACTAMENTE {num_dishes} platos conocidos. Cada receta debe:\n"
        "1. Tener un nombre culinario auténtico.\n"
        "2. Incluir entre 3 y 7 ingredientes de la lista que tengan **afinidad** entre sí.\n"
        f"3. Cumplir objetivos nutricionales: Energía {target['Calorías'][0]}–{target['Calorías'][1]} kcal; "
        f"%C {target['Carbohidratos'][0]}–{target['Carbohidratos'][1]}%; "
        f"%P {target['Proteínas'][0]}–{target['Proteínas'][1]}%; "
        f"%F {target['Grasas'][0]}–{target['Grasas'][1]}%.\n"
        "Si no puedes garantizar afinidad o no existen platos reales que cumplan todo, devuelve {\"dishes\": []}.\n"
        "Responde SOLO con JSON válido: {\"dishes\":[...]}."
    )

    for i in range(1, max_retries + 1):
        print(f"[INFO] Intento {i}/{max_retries} para generar recetas...")
        try:
            resp = model.generate_content(prompt)
            text = resp.text or ""
            match = re.search(r'\{[\s\S]*\}', text)
            clean = match.group(0) if match else re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()
            data = json.loads(clean) if clean else {}
            if isinstance(data, dict) and 'dishes' in data:
                return json.dumps(data)
        except Exception as e:
            print(f"[WARN] Error en generación: {e}")
        time.sleep(3)

    print(f"[ERROR] No se pudieron generar recetas válidas tras {max_retries} intentos.")
    return json.dumps({"dishes": []})

# --- Lógica Principal (Ejemplo de uso) ---

def main():
    # Carga de .env
    dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
        print(f"[INFO] Archivo .env cargado desde: {dotenv_path}")
    else:
        if load_dotenv():
            print("[INFO] Archivo .env cargado desde el directorio actual.")
        else:
            print("[WARN] Archivo .env no encontrado.")

    print("--- Iniciando Generador de Dietas ---")

    # Configuración API
    if not configure_gemini_api():
        print("[WARN] La Opción 1 (IA) no estará disponible.")

    # Rutas de archivos
    project_root = os.path.dirname(dotenv_path)
    ingredients_filepath_rel = os.getenv('INGREDIENTES_CSV')
    platos_filepath_rel = os.getenv('PLATOS_CSV')

    ingredients_filepath = os.path.abspath(os.path.join(project_root, ingredients_filepath_rel)) if ingredients_filepath_rel else None
    platos_filepath     = os.path.abspath(os.path.join(project_root, platos_filepath_rel))     if platos_filepath_rel     else None

    # Carga de ingredientes
    df_ingredientes_db, numeric_cols_db = cargar_ingredientes(ingredients_filepath)
    if df_ingredientes_db.empty:
        print("[ERROR] No se pudieron cargar los ingredientes de la base de datos local.")
    else:
        print(f"[INFO] Ingredientes cargados de '{ingredients_filepath}'. Total: {len(df_ingredientes_db)}")

    # Objetivos nutricionales
    objetivos_nutricionales = {
        'Calorías':      [350, 650],
        'Carbohidratos': [40,  60],
        'Proteínas':     [20,  35],
        'Grasas':        [20,  35]
    }
    print(f"\n[INFO] Objetivos nutricionales para cada plato:")
    for k, v in objetivos_nutricionales.items():
        unit = "kcal" if k == 'Calorías' else '%'
        print(f"  - {k}: {v[0]} - {v[1]} {unit}")

    # Menú de opciones
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

        df_prototipos = df_ingredientes_db.sample(n=num_prototipos_para_gemini, random_state=random.randint(1, 1000))
        prototipos_gemini = []
        for _, row in df_prototipos.iterrows():
            try:
                prototipos_gemini.append({
                    "name":   row['NOMBRE DEL ALIMENTO'],
                    "energy": float(row['Energía (kcal)']),
                    "protein":float(row['Proteínas totales (g)']),
                    "fat":    float(row['Grasa total (g)']),
                    "carbs":  float(row['Carbohidratos disponibles (g)'])
                })
            except (KeyError, ValueError):
                continue

        if len(prototipos_gemini) < 3:
            print(f"[ERROR] No hay suficientes prototipos válidos ({len(prototipos_gemini)}) después del filtrado. Se necesitan al menos 3.")
            return

        print(f"[INFO] Usando {len(prototipos_gemini)} ingredientes de la BD como prototipos para Gemini.")
        num_platos_a_generar_ia = 3
        try:
            respuesta_gemini_json_str = ask_gemini_to_select(
                prototipos_gemini,
                num_platos_a_generar_ia,
                objetivos_nutricionales,
                max_retries=5
            )
            respuesta_gemini = json.loads(respuesta_gemini_json_str)
        except ValueError as ve:
            print(f"[ERROR] No se pudo generar platos con Gemini: {ve}")
            return
        except Exception as e:
            print(f"[ERROR] Ocurrió un error inesperado durante la generación con Gemini: {e}")
            return

        # Si no hay platos válidos, abortar inmediatamente
        if not respuesta_gemini.get('dishes'):
            print("[INFO] No se generaron platos comestibles con afinidad. Abortando Opción 1.")
            return

        print("\n--- Platos Generados por IA ---")
        for i, plato_info in enumerate(respuesta_gemini['dishes']):
            nombre_plato = plato_info.get('dish_name', f'Plato Desconocido {i+1}')
            ingredientes_receta = plato_info.get('ingredients', [])
            pesos_receta = plato_info.get('weights_g', [])

            print(f"\n{i+1}. Plato: {nombre_plato}")
            selection_para_calculo = []
            for ing_name, ing_weight in zip(ingredientes_receta, pesos_receta):
                print(f"   - {ing_name}: {ing_weight:.1f} g")
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
