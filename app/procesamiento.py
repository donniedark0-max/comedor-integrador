import os
import re
import json
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import numpy as np
import random
import time
from dotenv import load_dotenv

from google.genai import Client
from app.settings import settings

# --- Configure your Gemini API key ---
os.environ["GENAI_API_KEY"] = settings.GENAI_API_KEY

# --- 1. Load and preprocess ingredients (improved from your test) ---
def cargar_ingredientes(filepath):
    if not filepath or not os.path.exists(filepath):
        raise FileNotFoundError(f"No se encontró el archivo de ingredientes: {filepath}")

    # Try multiple encodings
    for enc in ("utf-8", "latin1", "iso-8859-1"):
        try:
            df = pd.read_csv(filepath, encoding=enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        # last try without specifying encoding
        df = pd.read_csv(filepath)

    # Expected numeric columns
    numeric_cols = [
        'Energía (kcal)', 'Agua (g)', 'Proteínas totales (g)', 'Grasa total (g)',
        'Carbohidratos disponibles (g)', 'Fibra dietaria (g)', 'Calcio (mg)',
        'Fósforo (mg)', 'Zinc (mg)', 'Hierro (mg)',
        'Vitamina A equivalentes totales (µg)', 'Tiamina (mg)', 'Riboflavina (mg)',
        'Niacina (mg)', 'Vitamina C (mg)', 'Sodio (mg)', 'Potasio (mg)'
    ]
    # Filter missing cols
    missing = [c for c in numeric_cols if c not in df.columns]
    if missing:
        print(f"[WARN] Faltan columnas numéricas: {missing}")
        numeric_cols = [c for c in numeric_cols if c in df.columns]
    if 'NOMBRE DEL ALIMENTO' not in df.columns:
        raise KeyError("Falta la columna 'NOMBRE DEL ALIMENTO'")

    # Convert & clean
    df[numeric_cols] = (
        df[numeric_cols]
        .astype(str)
        .apply(lambda col: pd.to_numeric(col.str.replace(',', '.', regex=False), errors='coerce'))
        .fillna(0)
    )
    df['NOMBRE_NORMALIZADO'] = (
        df['NOMBRE DEL ALIMENTO']
        .astype(str)
        .str.strip()
        .str.lower()
    )
    df = df.dropna(subset=['NOMBRE_NORMALIZADO'])
    df = df[df['NOMBRE_NORMALIZADO'] != '']
    return df, numeric_cols

# --- 2. Cluster ingredients (unchanged) ---
def cluster_ingredientes(df, numeric_cols, n_clusters=4):
    scaler = MinMaxScaler()
    X = scaler.fit_transform(df[numeric_cols])
    model = KMeans(n_clusters=n_clusters, init='k-means++', n_init=10, max_iter=300, random_state=0)
    labels = model.fit_predict(X)
    df['Cluster'] = labels
    return {i: df[df.Cluster==i] for i in range(n_clusters)}, X

# --- 3. Select prototypes with affinity: sample from largest cluster ---
def pick_affine_prototipos(cluster_map, min_ing=3, max_ing=7):
    # find cluster with most items
    best_cluster = max(cluster_map.items(), key=lambda kv: len(kv[1]))[1]
    if len(best_cluster) < min_ing:
        print("[ERROR] No hay suficientes ingredientes similares para garantizar afinidad.")
        return []
    n = random.randint(min_ing, min(max_ing, len(best_cluster)))
    sampled = best_cluster.sample(n)
    return [
        {
            'name': row['NOMBRE DEL ALIMENTO'],
            'energy': float(row['Energía (kcal)']),
            'protein': float(row['Proteínas totales (g)']),
            'fat': float(row['Grasa total (g)']),
            'carbs': float(row['Carbohidratos disponibles (g)']),
        }
        for _, row in sampled.iterrows()
    ]

# --- 4. Ask Gemini for coherent Peruvian dish (improved retries & JSON validation) ---
def ask_gemini_to_select(prototypes, max_retries=5):
    api_key = os.environ.get("GENAI_API_KEY")
    if not api_key:
        raise ValueError("Define GENAI_API_KEY en environment.")
    client = Client(api_key=api_key)

    prompt = (
        "Eres un chef de cocina peruana; selecciona un plato reconocido y coherente usando SÓLO estos ingredientes:\n"
        f"{json.dumps(prototypes, ensure_ascii=False, indent=2)}\n"
        "Responde ÚNICAMENTE con un JSON: {\"dish_name\": string, \"ingredients\": [names], \"weights_g\": [integers]}. "
        "Si no es posible, devuelve {}."
    )

    for attempt in range(1, max_retries+1):
        print(f"[INFO] Gemini intento {attempt}/{max_retries}...")
        resp = client.models.generate_content(
            model="gemini-2.5-flash-preview-04-17",
            contents=prompt
        )
        raw = resp.candidates[0].content
        text = getattr(raw, 'text', None) or ''.join(getattr(p, 'text', '') for p in getattr(raw, 'parts', []))
        clean = re.sub(r"^```json|```$", "", text, flags=re.IGNORECASE).strip()
        try:
            data = json.loads(clean)
            if (
                isinstance(data, dict)
                and 'dish_name' in data
                and isinstance(data.get('ingredients'), list)
                and isinstance(data.get('weights_g'), list)
                and len(data['ingredients']) == len(data['weights_g'])
                and 3 <= len(data['ingredients']) <= 7
            ):
                return data
            else:
                print(f"[WARN] Formato inválido o ingredientes insuficientes: {data}")
        except json.JSONDecodeError:
            print(f"[WARN] JSON inválido: {clean}")
        time.sleep(2)

    print("[ERROR] Gemini no devolvió un JSON válido tras todos los intentos.")
    return {}

# --- 5. Compute totals from Gemini selection (unchanged) ---
def calcular_totales_gemini(df, selection):
    totals = {'Calorías': 0, 'Carbohidratos': 0, 'Proteínas': 0, 'Grasas': 0}
    for item in selection:
        row = df[df['NOMBRE DEL ALIMENTO'] == item['name']].iloc[0]
        factor = item['grams'] / 100.0
        totals['Calorías']      += row['Energía (kcal)'] * factor
        totals['Carbohidratos'] += row['Carbohidratos disponibles (g)'] * factor
        totals['Proteínas']     += row['Proteínas totales (g)'] * factor
        totals['Grasas']        += row['Grasa total (g)'] * factor
    return totals

# --- 6. Generate complete dishes from CSV (unchanged) ---
def generar_platos_completos(platos_csv, num=3):
    dfp = pd.read_csv(platos_csv)
    res = []
    for _ in range(num):
        r = dfp.sample(1).iloc[0]
        E, C, P, F = map(
            float,
            [r['Energía (kcal)'], r['Carbohidratos disponibles (g)'],
             r['Proteínas totales (g)'], r['Grasa total (g)']]
        )
        res.append({
            'Plato': r['NOMBRE DEL ALIMENTO'], 'Energía': E,
            'Carbohidratos': C, 'Proteínas': P, 'Grasas': F,
            'Porcentajes': {
                'Carbohidratos': C * 4 / E * 100,
                'Proteínas':    P * 4 / E * 100,
                'Grasas':       F * 9 / E * 100
            }
        })
    return res

# --- 7. Main interface (adapted option 1) ---
def main():
    load_dotenv()
    print("Elija opción (1: Ingredientes balanceados con IA, 2: Platos CSV):")
    try:
        op = int(input().strip())
    except ValueError:
        print("Opción no válida."); return

    if op == 1:
        df, cols = cargar_ingredientes(settings.INGREDIENTES_CSV)
        print(f"[INFO] Ingredientes cargados: {len(df)} registros")
        cluster_map, _ = cluster_ingredientes(df, cols)
        print(f"[INFO] Ingredientes agrupados en {len(cluster_map)} clusters")

        n = int(input("¿Cuántos platos quieres generar? [3]: ").strip() or 3)
        objetivos = {'Carbohidratos': (50,60), 'Proteínas': (10,15), 'Grasas': (20,30)}
        max_attempts = 5

        for i in range(1, n+1):
            print(f"\n--- Generando Plato {i} ---")
            for attempt in range(1, max_attempts+1):
                protos = pick_affine_prototipos(cluster_map)
                if not protos:
                    print("[ERROR] No se generaron prototipos con afinidad. Abortando.")
                    return
                print("Prototipos seleccionados:")
                for p in protos:
                    print(f" - {p['name']} (E{p['energy']} kcal, C{p['carbs']}g, P{p['protein']}g, F{p['fat']}g)")

                data = ask_gemini_to_select(protos, max_retries=max_attempts)
                if not data:
                    continue

                selection = [{'name': n, 'grams': g} for n, g in zip(data['ingredients'], data['weights_g'])]
                totals = calcular_totales_gemini(df, selection)
                pc = totals['Carbohidratos'] * 4 / totals['Calorías'] * 100
                pp = totals['Proteínas'] * 4 / totals['Calorías'] * 100
                pf = totals['Grasas'] * 9 / totals['Calorías'] * 100

                if (
                    objetivos['Carbohidratos'][0] <= pc <= objetivos['Carbohidratos'][1] and
                    objetivos['Proteínas'][0]   <= pp <= objetivos['Proteínas'][1]   and
                    objetivos['Grasas'][0]      <= pf <= objetivos['Grasas'][1]
                ):
                    break
                print("[WARN] No cumple objetivos nutricionales, reintentando...")

            # show final dish
            name = data.get('dish_name', 'Plato personalizado')
            print(f"\nPlato: {name}")
            for itm in selection:
                print(f"  - {itm['name']}: {itm['grams']}g")
            print(f"  Energía: {totals['Calorías']:.1f} kcal")
            print(f"  Macronutrientes: C {pc:.1f}%, P {pp:.1f}%, F {pf:.1f}%")

    elif op == 2:
        platos = generar_platos_completos(settings.PLATOS_CSV)
        for p in platos:
            print(f"\n{p['Plato']}")
            print(f"  Energía: {p['Energía']:.1f} kcal")
            for mac, val in p['Porcentajes'].items():
                print(f"  {mac}: {val:.1f}%")
    else:
        print("Opción no válida.")


