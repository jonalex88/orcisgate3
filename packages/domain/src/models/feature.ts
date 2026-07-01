export interface Feature {
  id: string
  name: string
  description: string
  source: string
  /** Active features surface as an ActionItem via the classifier; passive ones don't. */
  isPassive: boolean
}
