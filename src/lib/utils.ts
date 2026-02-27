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
