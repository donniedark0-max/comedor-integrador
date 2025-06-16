from pydantic import BaseModel
from typing import List, Optional

class MenuRequest(BaseModel):
    n_platos: int = 3
    # más adelante: include/exclude lists

class MenuItem(BaseModel):
    name: str
    energy: float
    carbs: float
    protein: float
    fat: float
    grams: float

class Dish(BaseModel):
    dish_name: str
    items: List[MenuItem]

class MenuResponse(BaseModel):
    dishes: List[Dish]

class Order(BaseModel):
    menu_id: str
    items: List[MenuItem]
    user_id: Optional[str]
