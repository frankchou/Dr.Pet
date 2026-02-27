export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${year}年${month}月${day}日`
}

export function severityEmoji(level: number): string {
  const emojis = ['😊', '🙁', '😟', '😰', '😱', '🆘']
  return emojis[Math.min(Math.max(level, 0), 5)]
}

export function severityLabel(level: number): string {
  const labels = ['正常', '輕微', '輕度', '中度', '嚴重', '極重']
  return labels[Math.min(Math.max(level, 0), 5)]
}

export function symptomTypeLabel(type: string): string {
  const map: Record<string, string> = {
    tear: '淚腺/淚痕',
    skin: '皮膚搔癢',
    digestive: '腸胃敏感',
    oral: '口臭牙結石',
    ear: '耳朵發炎',
    joint: '關節',
    other: '其他',
  }
  return map[type] || type
}

export function productTypeLabel(type: string): string {
  const map: Record<string, string> = {
    feed: '飼料',
    can: '罐頭',
    snack: '零食',
    supplement: '保健品',
    dental: '牙膏牙粉',
    shampoo: '洗毛精',
    other: '其他',
  }
  return map[type] || type
}

export function parseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

// Authoritative veterinary reference organizations for AI prompts
export const VET_REFERENCE_SCOPE = `知識參考範圍：世界動物衛生組織（World Organisation for Animal Health）、世界獸醫協會（World Veterinary Association）、世界小動物獸醫師協會（WSAVA）、Companion Animal Parasite Council (CAPC)、Orthopedic Foundation for Animals (OFA)、Association for Pet Obesity Prevention (APOP)、NRC（National Research Council）、AAFCO（美國飼料管理協會）、FEDIAF（歐洲寵物食品工業聯合會）、Pet Nutrition Alliance (PNA)、American Academy of Veterinary Nutrition (AAVN)、Waltham Petcare Science Institute、農業部動植物防疫檢疫署、農業部食品藥物管理署、農業部、中華民國獸醫師公會全國聯合會、台灣小動物獸醫學會、台灣獸醫內科醫學會、台灣獸醫外科醫學會、國立臺灣大學獸醫專業學院、國立中興大學獸醫學系`
