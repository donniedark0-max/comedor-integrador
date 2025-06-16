from fastapi.middleware.cors import CORSMiddleware
import uuid, json
from fastapi import FastAPI, HTTPException
from typing import List

from app.models import MenuRequest, MenuResponse, Dish, MenuItem, Order
from app.procesamiento import (
    cargar_ingredientes,
    cluster_ingredientes,
    pick_affine_prototipos,
    ask_gemini_to_select,
    calcular_totales_gemini,
    generar_platos_completos,
)
from app.settings import settings

app = FastAPI(title="Menús API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Precargamos la BD de ingredientes una sola vez
df_ing, num_cols = cargar_ingredientes(settings.INGREDIENTES_CSV)

@app.post("/menus/balanced", response_model=MenuResponse)
async def generate_balanced_menu(req: MenuRequest):
    dishes = []

    for _ in range(req.n_platos):
        # 1. Clustering con el nº de clusters de settings
        cluster_map, _ = cluster_ingredientes(df_ing, num_cols, n_clusters=settings.CLUSTERS)

        # 2. Muestreo de prototipos afinados
        protos = pick_affine_prototipos(
            cluster_map,
            min_ing=settings.PROTOTIPOS_MIN,
            max_ing=settings.PROTOTIPOS_MAX
        )
        if not protos:
            raise HTTPException(status_code=500, detail="No se pudieron muestrear ingredientes por afinidad.")

        # 3. Llamada a Gemini con reintentos de settings
        data = ask_gemini_to_select(protos, max_retries=settings.GEMINI_MAX_RETRIES)
        if not data:
            raise HTTPException(status_code=502, detail="Gemini no devolvió un plato válido.")

        # 4. Construir la selección y calcular totales
        selection = [{'name': n, 'grams': g} for n, g in zip(data['ingredients'], data['weights_g'])]
        totals = calcular_totales_gemini(df_ing, selection)

        # 5. Mapear a MenuItem
        items: List[MenuItem] = []
        for sel in selection:
            row = df_ing[df_ing['NOMBRE DEL ALIMENTO'] == sel['name']].iloc[0]
            items.append(MenuItem(
                name=sel['name'],
                energy=float(row['Energía (kcal)']),
                carbs=float(row['Carbohidratos disponibles (g)']),
                protein=float(row['Proteínas totales (g)']),
                fat=float(row['Grasa total (g)']),
                grams=sel['grams']
            ))

        # 6. Añadir Dish con nombre y lista de ítems
        dishes.append(Dish(
            dish_name=data.get('dish_name', 'Plato personalizado'),
            items=items
        ))

    return MenuResponse(dishes=dishes)


@app.post("/menus/complete", response_model=MenuResponse)
async def generate_complete_menu(req: MenuRequest):
    raw = generar_platos_completos(settings.PLATOS_CSV, req.n_platos)
    dishes = []

    for plato in raw:
        item = MenuItem(
            name=plato['Plato'],
            energy=plato['Energía'],
            carbs=plato['Carbohidratos'],
            protein=plato['Proteínas'],
            fat=plato['Grasas'],
            grams=100.0
        )
        dishes.append(Dish(dish_name=plato['Plato'], items=[item]))

    return MenuResponse(dishes=dishes)


@app.post("/orders")
async def create_order(order: Order):
    return {"order_id": str(uuid.uuid4())}
