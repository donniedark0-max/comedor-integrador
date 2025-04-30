# app/main.py

from fastapi.middleware.cors import CORSMiddleware

import uuid, json
from fastapi import FastAPI, HTTPException
from typing import List
from app.models import MenuRequest, MenuResponse, MenuItem, Order
from app.procesamiento import (
    cargar_ingredientes,
    cluster_ingredientes,
    pick_random_prototipos,
    ask_gemini_to_select,
    calcular_totales_gemini,
    generar_platos_completos,
)
from app.settings import settings

app = FastAPI(title="Menús API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js corre ahí
    allow_methods=["*"],
    allow_headers=["*"],
)

# precarga datos en memoria
df_ing, num_cols = cargar_ingredientes(settings.INGREDIENTES_CSV)

@app.post("/menus/balanced", response_model=MenuResponse)
async def generate_balanced_menu(req: MenuRequest):
    platos = []
    for _ in range(req.n_platos):
        cluster_map, _ = cluster_ingredientes(df_ing, num_cols)
        protos = pick_random_prototipos(cluster_map, df_ing)
        gem = ask_gemini_to_select(protos)
        data = json.loads(gem)
        sel = [{'name':n,'grams':g} for n,g in zip(data['ingredients'], data['weights_g'])]
        totals = calcular_totales_gemini(df_ing, sel)
        items = [
            MenuItem(
                name=i['name'],
                energy=float(df_ing.loc[df_ing['NOMBRE DEL ALIMENTO']==i['name'],'Energía (kcal)']),
                carbs=float(df_ing.loc[df_ing['NOMBRE DEL ALIMENTO']==i['name'],'Carbohidratos disponibles (g)']),
                protein=float(df_ing.loc[df_ing['NOMBRE DEL ALIMENTO']==i['name'],'Proteínas totales (g)']),
                fat=float(df_ing.loc[df_ing['NOMBRE DEL ALIMENTO']==i['name'],'Grasa total (g)']),
                grams=i['grams']
            ) for i in sel
        ]
        platos.append(items)
    return {"platos": platos}

@app.post("/menus/complete", response_model=MenuResponse)
async def generate_complete_menu(req: MenuRequest):
    # usa platos.csv para devolver platos ya armados
    raw = generar_platos_completos(settings.PLATOS_CSV, req.n_platos)
    platos = []
    for plato in raw:
        # cada plato lo devolvemos como una lista de un solo MenuItem con gramos fijos a 100g
        item = MenuItem(
            name=plato['Plato'],
            energy=plato['Energía'],
            carbs=plato['Carbohidratos'],
            protein=plato['Proteínas'],
            fat=plato['Grasas'],
            grams=100.0
        )
        platos.append([item])
    return {"platos": platos}

@app.post("/orders")
async def create_order(order: Order):
    # más adelante podrías guardar en Mongo, aquí solo simulo
    return {"order_id": str(uuid.uuid4())}