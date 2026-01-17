export interface DataRow {
  date: string
  metro: string
  zhvi?: number
  inventory?: number
  daysPending?: number
  newConstruction?: number
}

export interface Summary {
  metro: string
  zhvi?: number
  zhviYoY?: number
  inventory?: number
  inventoryYoY?: number
  daysPending?: number
  daysPendingYoY?: number
  newConstruction?: number
}

export interface DashboardData {
  metros: string[]
  dates: string[]
  data: DataRow[]
  summary: Summary[]
  latestDate: string
}
