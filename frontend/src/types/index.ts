export interface MenuItem {
    id: string
    name: string
    grams: number
    energy: number
    carbs: number
    protein: number
    fat: number
    category: string
  }
  
  export interface MenuResponse {
    platos: MenuItem[][]
  }
  
  export interface Filters {
    turno: "desayuno" | "almuerzo" | "cena"
    includeCategories: {
      carnes: boolean
      legumbres: boolean
      vegetales: boolean
      granos: boolean
    }
  }
  