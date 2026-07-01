export interface InventoryItem {
  id: string
  name: string
  description: string
  quantity: number
  equipped: boolean
  weight: number
  charges?: {
    current: number
    max: number
    rechargeOn: 'shortRest' | 'longRest' | 'dawn' | 'never'
  }
}
