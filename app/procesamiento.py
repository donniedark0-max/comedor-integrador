import os
import re
import json
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import numpy as np, random

from google.genai import Client
from app.settings import settings

# --- Configure your Gemini API key ---
# Option 1: Set environment variable before running script:
os.environ["GENAI_API_KEY"] = settings.GENAI_API_KEY


# 1. Load and preprocess ingredients
def cargar_ingredientes(filepath):
    df = pd.read_csv(filepath)
    numeric_cols = [
        'Energía (kcal)', 'Agua (g)', 'Proteínas totales (g)', 'Grasa total (g)',
        'Carbohidratos disponibles (g)', 'Fibra dietaria (g)', 'Calcio (mg)',
        'Fósforo (mg)', 'Zinc (mg)', 'Hierro (mg)',
        'Vitamina A equivalentes totales (µg)', 'Tiamina (mg)', 'Riboflavina (mg)',
        'Niacina (mg)', 'Vitamina C (mg)', 'Sodio (mg)', 'Potasio (mg)'
    ]
    df[numeric_cols] = df[numeric_cols].apply(
        lambda col: pd.to_numeric(col.astype(str).str.replace(',', '.'), errors='coerce')
    ).fillna(0)
    return df, numeric_cols

# 2. Cluster ingredients
def cluster_ingredientes(df, numeric_cols, n_clusters=4):
    scaler = MinMaxScaler()
    X = scaler.fit_transform(df[numeric_cols])
    model = KMeans(n_clusters=n_clusters, init='k-means++', n_init=10, max_iter=300, random_state=0)
    labels = model.fit_predict(X)
    df['Cluster'] = labels
    return {i: df[df.Cluster==i] for i in range(n_clusters)}, X

# 3. Randomly pick one prototype per cluster for variety
def pick_random_prototipos(cluster_map, df):
    protos = []
    for i, sub in cluster_map.items():
        row = sub.sample(1).iloc[0]
        protos.append({
            'name': row['NOMBRE DEL ALIMENTO'],
            'energy': float(row['Energía (kcal)']),
            'protein': float(row['Proteínas totales (g)']),
            'fat': float(row['Grasa total (g)']),
            'carbs': float(row['Carbohidratos disponibles (g)'])
        })
    return protos

# 4. Ask Gemini for coherent selection with Peruvian lunch context
def ask_gemini_to_select(prototypes):
    api_key = os.environ.get("GENAI_API_KEY")
    if not api_key:
        raise ValueError("Define GENAI_API_KEY en environment.")
    client = Client(api_key=api_key)

    # Prompt instructing Gemini to choose a well-known Peruvian dish
    prompt = (
        "You are a chef specializing in typical Peruvian university lunch dishes. "
        "Given these ingredient prototypes with nutrition data, select three that form a coherent, well-known Peruvian dish "
        "(e.g., 'Lomo Saltado', 'Arroz con Pollo', 'Seco de Pollo', 'Ají de Gallina', 'Tallarin Saltado'). "
        "Assign integer weights in grams, and provide the dish name. "
        "Respond ONLY with a JSON object containing keys 'dish_name', 'ingredients' (list of names), and 'weights_g' (list of integers)."
    )
    prompt += "\nPrototypes: " + json.dumps(prototypes)

    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-04-17",
        contents=prompt
    )
    raw = response.candidates[0].content
    text = getattr(raw, 'text', None) or ''.join(
        getattr(p, 'text', '') for p in getattr(raw, 'parts', [])
    ) or str(raw)
    clean = re.sub(r"^```json|```$", "", text).strip()
    return clean

# 5. Compute totals from Gemini selection
def calcular_totales_gemini(df, selection):
    totals = {'Calorías': 0, 'Carbohidratos': 0, 'Proteínas': 0, 'Grasas': 0}
    for item in selection:
        row = df[df['NOMBRE DEL ALIMENTO'] == item['name']].iloc[0]
        factor = item['grams'] / 100
        totals['Calorías']      += row['Energía (kcal)'] * factor
        totals['Carbohidratos'] += row['Carbohidratos disponibles (g)'] * factor
        totals['Proteínas']     += row['Proteínas totales (g)'] * factor
        totals['Grasas']        += row['Grasa total (g)'] * factor
    return totals

# 6. Generate complete dishes from platos.csv
def generar_platos_completos(platos_csv, num=3):
    dfp = pd.read_csv(platos_csv)
    res=[]
    for _ in range(num):
        r = dfp.sample(1).iloc[0]
        E,C,P,F = map(lambda c: float(r[c]), ['Energía (kcal)','Carbohidratos disponibles (g)','Proteínas totales (g)','Grasa total (g)'])
        res.append({
            'Plato': r['NOMBRE DEL ALIMENTO'], 'Energía':E, 'Carbohidratos':C,'Proteínas':P,'Grasas':F,
            'Porcentajes':{
                'Carbohidratos': C*4/E*100,
                'Proteínas':    P*4/E*100,
                'Grasas':       F*9/E*100
            }
        })
    return res

# 7. Main interface
def main():
    print("Elija opción (1: Ingredientes balanceados con validación Gemini, 2: Ajustar plato específico):")
    op = int(input().strip())

    if op == 1:
        df, cols = cargar_ingredientes(settings.INGREDIENTES_CSV)
        print(f"[INFO] Ingredientes cargados: {len(df)} filas")
        cluster_map, X = cluster_ingredientes(df, cols)
        print(f"[INFO] Clustering completado en {len(cluster_map)} grupos.")
        n = int(input("¿Cuántos platos quieres generar? [3]: ").strip() or 3)

        target = {'Carbohidratos': (50,60), 'Proteínas': (10,15), 'Grasas': (20,30)}
        max_attempts = 5

        for idx in range(1, n+1):
            print(f"\n--- Plato {idx} ---")
            for attempt in range(1, max_attempts+1):
                print(f"[INFO] Intento {attempt} de {max_attempts}...")
                protos = pick_random_prototipos(cluster_map, df)
                print("Prototipos:")
                for p in protos:
                    print(f" - {p['name']} (E{p['energy']} kcal, C{p['carbs']}g, P{p['protein']}g, F{p['fat']}g)")
                try:
                    gem_json = ask_gemini_to_select(protos)
                    data = json.loads(gem_json)
                except Exception as e:
                    print(f"[WARN] Error en respuesta Gemini: {e}")
                    continue

                selection = [{'name': n, 'grams': g} for n,g in zip(data['ingredients'], data['weights_g'])]
                totals = calcular_totales_gemini(df, selection)
                pc = totals['Carbohidratos']*4/totals['Calorías']*100
                pp = totals['Proteínas']*4/totals['Calorías']*100
                pf = totals['Grasas']*9/totals['Calorías']*100
                print(f"[DEBUG] % macros => C:{pc:.1f}, P:{pp:.1f}, F:{pf:.1f}")
                if target['Carbohidratos'][0] <= pc <= target['Carbohidratos'][1] and \
                   target['Proteínas'][0] <= pp <= target['Proteínas'][1] and \
                   target['Grasas'][0] <= pf <= target['Grasas'][1]:
                    break
                print("[WARN] No cumple macros, reintentando combinación de ingredientes...")

            dish_name = data.get('dish_name', 'Plato personalizado')
            print(dish_name)
            for itm in selection:
                print(f"  {itm['name']}: {itm['grams']}g")
            print(f"  Energía: {totals['Calorías']:.1f} kcal")
            print(f"  Carbohidratos: {totals['Carbohidratos']:.1f} g")
            print(f"  Proteínas: {totals['Proteínas']:.1f} g")
            print(f"  Grasas: {totals['Grasas']:.1f} g")
            print("  % Macronutrientes:")
            print(f"    Carbohidratos: {pc:.1f}%")
            print(f"    Proteínas:    {pp:.1f}%")
            print(f"    Grasas:       {pf:.1f}%")

    elif op == 2:
        platos = generar_platos_completos(settings.PLATOS_CSV)
        for p in platos:
            print(f"\n{p['Plato']}")
            print(f"  Energía: {p['Energía']:.1f} kcal")
            print(f"  Carbohidratos: {p['Carbohidratos']:.1f} g")
            print(f"  Proteínas: {p['Proteínas']:.1f} g")
            print(f"  Grasas: {p['Grasas']:.1f} g")
            print("  % Macronutrientes:")
            for k, v in p['Porcentajes'].items(): print(f"    {k}: {v:.1f}%")
    else:
        print("Opción no válida.")

