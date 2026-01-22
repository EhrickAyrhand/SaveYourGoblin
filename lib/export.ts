/**
 * Export utilities for content items
 * Supports PDF and JSON export formats
 */

import jsPDF from 'jspdf'
import type { LibraryContentItem } from '@/components/rpg/library-card'
import type { Character, Environment, Mission } from '@/types/rpg'

// Color tuple type
type RGBColor = [number, number, number]

// Color constants (RGB values)
const COLORS: {
  primaryHeader: RGBColor
  secondary: RGBColor
  sectionBg: RGBColor
  border: RGBColor
  textPrimary: RGBColor
  textSecondary: RGBColor
  success: RGBColor
  warning: RGBColor
  accent: RGBColor
  background: RGBColor
  cardBorder: RGBColor
  rose: RGBColor
  cyan: RGBColor
  purple: RGBColor
  indigo: RGBColor
  emerald: RGBColor
  amber: RGBColor
  blue: RGBColor
  green: RGBColor
  orange: RGBColor
  yellow: RGBColor
  pink: RGBColor
  white: RGBColor
  black: RGBColor
} = {
  primaryHeader: [12, 18, 32],
  secondary: [59, 130, 246],
  sectionBg: [17, 24, 39],
  border: [30, 41, 59],
  textPrimary: [226, 232, 240],
  textSecondary: [148, 163, 184],
  success: [34, 197, 94],
  warning: [248, 113, 113],
  accent: [167, 139, 250],
  background: [10, 16, 28],
  cardBorder: [35, 45, 68],
  rose: [244, 63, 94],
  cyan: [34, 211, 238],
  purple: [192, 132, 252],
  indigo: [129, 140, 248],
  emerald: [52, 211, 153],
  amber: [251, 191, 36],
  blue: [96, 165, 250],
  green: [74, 222, 128],
  orange: [251, 146, 60],
  yellow: [250, 204, 21],
  pink: [244, 114, 182],
  white: [255, 255, 255],
  black: [0, 0, 0],
}

type PdfLayoutContext = {
  doc: jsPDF
  pageWidth: number
  pageHeight: number
  margin: number
  headerHeight: number
  footerHeight: number
  contentStartY: number
  y: number
  currentPage: number
  renderPageHeader?: (layout: PdfLayoutContext) => void
}

function addNewPage(layout: PdfLayoutContext): void {
  layout.doc.addPage()
  drawPageBackground(layout.doc, layout.pageWidth, layout.pageHeight)
  drawPageBorder(layout.doc, layout.pageWidth, layout.pageHeight, layout.margin)
  layout.currentPage += 1
  layout.renderPageHeader?.(layout)
  layout.y = layout.contentStartY
}

function ensureSpace(layout: PdfLayoutContext, requiredSpace: number): boolean {
  if (layout.y + requiredSpace > layout.pageHeight - layout.footerHeight - layout.margin) {
    addNewPage(layout)
    return true
  }
  return false
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`
}

function getSafeText(text: string | undefined | null, fallback: string = '—'): string {
  if (!text || text.trim().length === 0) {
    return fallback
  }
  return text
}

/**
 * Helper function to draw a styled box/section with background and border
 */
function drawSectionBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: RGBColor = COLORS.sectionBg,
  borderColor: RGBColor = COLORS.border,
  borderWidth: number = 1
): void {
  // Draw background
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
  doc.setLineWidth(borderWidth)
  doc.rect(x, y, width, height, 'FD') // F = fill, D = draw border
  
  // Add subtle inner highlight for depth
  if (bgColor !== COLORS.white) {
    doc.setDrawColor(
      Math.min(255, bgColor[0] + 20),
      Math.min(255, bgColor[1] + 20),
      Math.min(255, bgColor[2] + 20)
    )
    doc.setLineWidth(0.3)
    doc.line(x + 1, y + 1, x + width - 1, y + 1)
  }
}

function drawPageBackground(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2])
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
}

function drawPageBorder(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number): void {
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2])
  doc.setLineWidth(0.5)
  doc.rect(margin - 3, margin - 3, pageWidth - (margin - 3) * 2, pageHeight - (margin - 3) * 2, 'D')
}

function drawCornerOrnament(doc: jsPDF, x: number, y: number, size: number): void {
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.8)
  doc.line(x, y, x + size, y)
  doc.line(x, y, x, y + size)
  doc.setLineWidth(0.4)
  doc.line(x + 2, y + 2, x + size - 4, y + 2)
  doc.line(x + 2, y + 2, x + 2, y + size - 4)
}

type BadgeStyle = {
  bgColor?: RGBColor
  textColor?: RGBColor
  borderColor?: RGBColor
}

function measureBadgeWidth(doc: jsPDF, text: string): number {
  const paddingX = 6
  const fontSize = 8.5
  doc.setFontSize(fontSize)
  doc.setFont(undefined, 'bold')
  const textWidth = doc.getTextWidth(text)
  return textWidth + paddingX * 2
}

function drawBadge(
  doc: jsPDF,
  x: number,
  y: number,
  text: string,
  style: BadgeStyle = {}
): number {
  const paddingX = 6
  const paddingY = 2
  const fontSize = 8.5
  doc.setFontSize(fontSize)
  doc.setFont(undefined, 'bold')
  const textWidth = doc.getTextWidth(text)
  const badgeWidth = textWidth + paddingX * 2
  const badgeHeight = fontSize + paddingY * 2

  const bgColor = style.bgColor ?? COLORS.secondary
  const borderColor = style.borderColor ?? bgColor
  const textColor = style.textColor ?? COLORS.white

  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
  doc.roundedRect(x, y, badgeWidth, badgeHeight, 2, 2, 'FD')

  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.text(text, x + paddingX, y + fontSize + 1.5)

  return badgeWidth
}

function renderBadgeGroup(
  doc: jsPDF,
  x: number,
  y: number,
  maxWidth: number,
  badges: Array<{ text: string; style?: BadgeStyle }>,
  rowSpacing: number = 4
): number {
  let cursorX = x
  let cursorY = y
  let maxY = y
  badges.forEach((badge) => {
    const badgeWidth = measureBadgeWidth(doc, badge.text)
    if (cursorX + badgeWidth > x + maxWidth) {
      cursorX = x
      cursorY += 12 + rowSpacing
    }
    drawBadge(doc, cursorX, cursorY, badge.text, badge.style)
    cursorX += badgeWidth + 6
    maxY = Math.max(maxY, cursorY + 12)
  })
  return maxY + rowSpacing
}

function measureBadgeGroupHeight(
  doc: jsPDF,
  maxWidth: number,
  badges: Array<{ text: string }>,
  rowSpacing: number = 4
): number {
  if (badges.length === 0) {
    return 0
  }
  const badgeHeight = 12
  let rows = 1
  let cursorX = 0
  badges.forEach((badge) => {
    const width = measureBadgeWidth(doc, badge.text)
    if (cursorX + width > maxWidth) {
      rows += 1
      cursorX = 0
    }
    cursorX += width + 6
  })
  return rows * badgeHeight + (rows - 1) * rowSpacing
}

type HeaderBadge = { text: string; style?: BadgeStyle }

function renderHeaderBlock(
  layout: PdfLayoutContext,
  title: string,
  badges: HeaderBadge[],
  iconText: string
): void {
  const { doc, pageWidth, margin } = layout
  const width = pageWidth - 2 * margin
  const titleFontSize = 16
  const titleY = margin + 11
  const badgeMaxWidth = width - 40
  const badgeHeight = measureBadgeGroupHeight(doc, badgeMaxWidth, badges, 4)
  const headerHeight = Math.max(26, 16 + badgeHeight + 6)

  doc.setFillColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2])
  doc.setLineWidth(0.8)
  doc.rect(margin, margin, width, headerHeight, 'FD')

  doc.setFontSize(titleFontSize)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text(truncateText(title, 40), margin + 6, titleY)

  const circleX = pageWidth - margin - 12
  const circleY = margin + 10
  doc.setFillColor(COLORS.sectionBg[0], COLORS.sectionBg[1], COLORS.sectionBg[2])
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.setLineWidth(1)
  doc.circle(circleX, circleY, 7, 'FD')
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text(iconText, circleX, circleY + 3, { align: 'center' })

  if (badges.length > 0) {
    renderBadgeGroup(doc, margin + 6, margin + 18, badgeMaxWidth, badges, 4)
  }

  layout.contentStartY = margin + headerHeight + 8
  layout.y = layout.contentStartY
}

type CardHeaderOptions = {
  title: string
  subtitle?: string
  icon?: string
  count?: number
  accentColor?: RGBColor
}

function getCardHeaderHeight(subtitle?: string): number {
  return subtitle ? 18 : 14
}

function drawCardContainer(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  borderColor: RGBColor
): void {
  drawSectionBox(doc, x, y, width, height, COLORS.sectionBg, borderColor, 1)
}

function drawCardHeader(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  options: CardHeaderOptions
): number {
  const headerHeight = getCardHeaderHeight(options.subtitle)
  const accent = options.accentColor ?? COLORS.secondary

  doc.setFillColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.rect(x, y, width, headerHeight, 'F')

  doc.setDrawColor(accent[0], accent[1], accent[2])
  doc.setLineWidth(0.8)
  doc.line(x, y + headerHeight, x + width, y + headerHeight)

  if (options.icon) {
    doc.setFillColor(accent[0], accent[1], accent[2])
    doc.roundedRect(x + 5, y + 3, 8, 8, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text(options.icon, x + 9, y + 9, { align: 'center' })
  }

  doc.setFontSize(9.5)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text(options.title, x + (options.icon ? 18 : 8), y + 10)

  if (options.subtitle) {
    doc.setFontSize(6.8)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    doc.text(options.subtitle, x + (options.icon ? 18 : 8), y + 15)
  }

  if (typeof options.count === 'number') {
    const badgeText = options.count.toString()
    doc.setFontSize(7)
    doc.setFont(undefined, 'bold')
    const badgeWidth = doc.getTextWidth(badgeText) + 6
    const badgeX = x + width - badgeWidth - 6
    doc.setFillColor(accent[0], accent[1], accent[2])
    doc.roundedRect(badgeX, y + 3, badgeWidth, 8, 2, 2, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text(badgeText, badgeX + badgeWidth / 2, y + 9, { align: 'center' })
  }

  return headerHeight
}

function renderCardLines(
  layout: PdfLayoutContext,
  options: CardHeaderOptions & {
    x: number
    width: number
    lines: string[]
    fontSize: number
    lineHeight: number
    gapAfter?: number
  }
): void {
  const {
    x,
    width,
    lines,
    fontSize,
    lineHeight,
    gapAfter = 8,
    ...headerOptions
  } = options

  let remaining = lines.length > 0 ? lines : [getSafeText('', '—')]
  while (remaining.length > 0) {
    const headerTitle = headerOptions.title
    const headerHeight = getCardHeaderHeight(headerOptions.subtitle)
    const availableHeight = layout.pageHeight - layout.footerHeight - layout.margin - layout.y
    const maxLines = Math.floor((availableHeight - headerHeight - 10) / (fontSize * lineHeight))

    if (maxLines <= 0) {
      addNewPage(layout)
      continue
    }

    const chunk = remaining.slice(0, maxLines)
    const bodyHeight = chunk.length * fontSize * lineHeight + 8
    const cardHeight = headerHeight + bodyHeight
    drawCardContainer(layout.doc, x, layout.y, width, cardHeight, headerOptions.accentColor ?? COLORS.border)
    drawCardHeader(layout.doc, x, layout.y, width, { ...headerOptions, title: headerTitle })

    layout.doc.setFontSize(fontSize)
    layout.doc.setFont(undefined, 'normal')
    layout.doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    let textY = layout.y + headerHeight + 6
    chunk.forEach((line) => {
      layout.doc.text(line, x + 6, textY + fontSize)
      textY += fontSize * lineHeight
    })

    layout.y += cardHeight + gapAfter
    remaining = remaining.slice(maxLines)
  }
}

function renderCardLinesInColumn(options: CardHeaderOptions & {
  doc: jsPDF
  x: number
  y: number
  width: number
  maxHeight: number
  lines: string[]
  fontSize: number
  lineHeight: number
}): { usedHeight: number; remainingLines: string[] } {
  const {
    doc,
    x,
    y,
    width,
    maxHeight,
    lines,
    fontSize,
    lineHeight,
    ...headerOptions
  } = options

  const headerHeight = getCardHeaderHeight(headerOptions.subtitle)
  const maxLines = Math.floor((maxHeight - headerHeight - 10) / (fontSize * lineHeight))
  const chunk = maxLines > 0 ? lines.slice(0, maxLines) : []
  const remainingLines = maxLines > 0 ? lines.slice(maxLines) : lines
  const bodyHeight = chunk.length * fontSize * lineHeight + 8
  const cardHeight = headerHeight + bodyHeight

  drawCardContainer(doc, x, y, width, cardHeight, headerOptions.accentColor ?? COLORS.border)
  drawCardHeader(doc, x, y, width, headerOptions)

  doc.setFontSize(fontSize)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  let textY = y + headerHeight + 6
  chunk.forEach((line) => {
    doc.text(line, x + 6, textY + fontSize)
    textY += fontSize * lineHeight
  })

  return { usedHeight: cardHeight + 6, remainingLines }
}

/**
 * Helper function to add a section header with background
 */
function addSectionHeader(
  doc: jsPDF,
  text: string,
  y: number,
  pageWidth: number,
  margin: number,
  fontSize: number = 14,
  options?: { iconText?: string; accentColor?: RGBColor }
): number {
  const headerHeight = fontSize + 8
  const headerY = y
  
  // Draw header background with subtle border
  doc.setFillColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setDrawColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setLineWidth(0)
  doc.rect(margin, headerY, pageWidth - 2 * margin, headerHeight, 'FD')

  const accentColor = options?.accentColor ?? COLORS.secondary
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(margin, headerY, 4, headerHeight, 'F')
  
  // Add subtle shadow effect (darker line below)
  doc.setDrawColor(COLORS.primaryHeader[0] * 0.7, COLORS.primaryHeader[1] * 0.7, COLORS.primaryHeader[2] * 0.7)
  doc.setLineWidth(0.5)
  doc.line(margin, headerY + headerHeight, pageWidth - margin, headerY + headerHeight)
  
  // Add header text with better padding
  doc.setFontSize(fontSize)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
  const iconText = options?.iconText
  const textX = iconText ? margin + 20 : margin + 8
  if (iconText) {
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
    doc.circle(margin + 11, headerY + headerHeight / 2, 4, 'F')
    doc.setFontSize(fontSize - 4)
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text(iconText, margin + 9, headerY + headerHeight / 2 + 2)
    doc.setFontSize(fontSize)
  }
  doc.text(text, textX, headerY + fontSize)
  
  return headerY + headerHeight + 5
}

type LinesBoxOptions = {
  x: number
  width: number
  fontSize: number
  lineHeight?: number
  paddingX?: number
  paddingY?: number
  textColor?: RGBColor
  bgColor?: RGBColor
  borderColor?: RGBColor
  spacingAfter?: number
  fontStyle?: 'normal' | 'bold'
  onPageBreak?: () => void
}

type TitledLinesBoxOptions = {
  x: number
  width: number
  title: string
  lines: string[]
  titleFontSize?: number
  titleColor?: RGBColor
  bodyFontSize?: number
  bodyColor?: RGBColor
  lineHeight?: number
  paddingX?: number
  paddingY?: number
  bgColor?: RGBColor
  borderColor?: RGBColor
  spacingAfter?: number
  repeatTitle?: boolean
  onPageBreak?: () => void
}

function buildWrappedLines(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontStyle: 'normal' | 'bold' = 'normal'
): string[] {
  doc.setFontSize(fontSize)
  doc.setFont(undefined, fontStyle)
  return doc.splitTextToSize(getSafeText(text), maxWidth) as string[]
}

function buildWrappedLinesFromList(
  doc: jsPDF,
  lines: string[],
  maxWidth: number,
  fontSize: number
): string[] {
  return lines.flatMap((line) => buildWrappedLines(doc, line, maxWidth, fontSize))
}

function buildBulletedLines(
  doc: jsPDF,
  items: string[],
  maxWidth: number,
  fontSize: number
): string[] {
  const safeItems = items.filter((item) => item && item.trim().length > 0)
  if (safeItems.length === 0) {
    return [getSafeText('', '—')]
  }
  doc.setFontSize(fontSize)
  doc.setFont(undefined, 'normal')
  const bullet = '• '
  const bulletWidth = doc.getTextWidth(bullet)
  const availableWidth = Math.max(0, maxWidth - bulletWidth)
  const lines: string[] = []
  safeItems.forEach((item) => {
    const wrapped = doc.splitTextToSize(item, availableWidth) as string[]
    if (wrapped.length === 0) {
      lines.push(bullet.trim())
      return
    }
    wrapped.forEach((line, index) => {
      lines.push(index === 0 ? `${bullet}${line}` : `${' '.repeat(bullet.length)}${line}`)
    })
  })
  return lines
}

function renderLinesBox(layout: PdfLayoutContext, lines: string[], options: LinesBoxOptions): void {
  const {
    x,
    width,
    fontSize,
    lineHeight = 1.3,
    paddingX = 8,
    paddingY = 8,
    textColor = COLORS.textPrimary,
    bgColor = COLORS.sectionBg,
    borderColor = COLORS.border,
    spacingAfter = 6,
    fontStyle = 'normal',
    onPageBreak,
  } = options

  const safeLines = lines.length > 0 ? lines : [getSafeText('', '—')]
  const lineHeightPx = fontSize * lineHeight
  let index = 0

  while (index < safeLines.length) {
    const availableHeight = layout.pageHeight - layout.footerHeight - layout.margin - layout.y
    const maxLines = Math.floor((availableHeight - paddingY * 2) / lineHeightPx)

    if (maxLines <= 0) {
      addNewPage(layout)
      onPageBreak?.()
      continue
    }

    const chunkLines = safeLines.slice(index, index + maxLines)
    const boxHeight = paddingY * 2 + chunkLines.length * lineHeightPx

    drawSectionBox(layout.doc, x, layout.y, width, boxHeight, bgColor, borderColor, 1)
    layout.doc.setFontSize(fontSize)
    layout.doc.setFont(undefined, fontStyle)
    layout.doc.setTextColor(textColor[0], textColor[1], textColor[2])

    let textY = layout.y + paddingY + fontSize
    chunkLines.forEach((line) => {
      layout.doc.text(line, x + paddingX, textY)
      textY += lineHeightPx
    })

    layout.y += boxHeight + spacingAfter
    index += chunkLines.length

    if (index < safeLines.length) {
      addNewPage(layout)
      onPageBreak?.()
    }
  }
}

function renderTwoColumnLinesBox(
  layout: PdfLayoutContext,
  lines: string[],
  options: LinesBoxOptions & { columnGap?: number }
): void {
  const {
    x,
    width,
    fontSize,
    lineHeight = 1.3,
    paddingX = 8,
    paddingY = 8,
    textColor = COLORS.textPrimary,
    bgColor = COLORS.sectionBg,
    borderColor = COLORS.border,
    spacingAfter = 6,
    fontStyle = 'normal',
    columnGap = 10,
    onPageBreak,
  } = options

  const safeLines = lines.length > 0 ? lines : [getSafeText('', '—')]
  const lineHeightPx = fontSize * lineHeight
  const columnWidth = (width - columnGap) / 2
  let index = 0

  while (index < safeLines.length) {
    const availableHeight = layout.pageHeight - layout.footerHeight - layout.margin - layout.y
    const maxLinesPerColumn = Math.floor((availableHeight - paddingY * 2) / lineHeightPx)

    if (maxLinesPerColumn <= 0) {
      addNewPage(layout)
      onPageBreak?.()
      continue
    }

    const leftCount = Math.min(maxLinesPerColumn, safeLines.length - index)
    const rightCount = Math.min(maxLinesPerColumn, safeLines.length - index - leftCount)
    const usedLines = Math.max(leftCount, rightCount)
    const boxHeight = paddingY * 2 + usedLines * lineHeightPx

    drawSectionBox(layout.doc, x, layout.y, width, boxHeight, bgColor, borderColor, 1)
    layout.doc.setFontSize(fontSize)
    layout.doc.setFont(undefined, fontStyle)
    layout.doc.setTextColor(textColor[0], textColor[1], textColor[2])

    let textY = layout.y + paddingY + fontSize
    const leftLines = safeLines.slice(index, index + leftCount)
    leftLines.forEach((line) => {
      layout.doc.text(line, x + paddingX, textY)
      textY += lineHeightPx
    })

    let rightY = layout.y + paddingY + fontSize
    const rightLines = safeLines.slice(index + leftCount, index + leftCount + rightCount)
    rightLines.forEach((line) => {
      layout.doc.text(line, x + columnWidth + columnGap + paddingX, rightY)
      rightY += lineHeightPx
    })

    layout.y += boxHeight + spacingAfter
    index += leftCount + rightCount

    if (index < safeLines.length) {
      addNewPage(layout)
      onPageBreak?.()
    }
  }
}

function renderTitledLinesBox(layout: PdfLayoutContext, options: TitledLinesBoxOptions): void {
  const {
    x,
    width,
    title,
    lines,
    titleFontSize = 10,
    titleColor = COLORS.textPrimary,
    bodyFontSize = 9,
    bodyColor = COLORS.textPrimary,
    lineHeight = 1.3,
    paddingX = 8,
    paddingY = 8,
    bgColor = COLORS.sectionBg,
    borderColor = COLORS.border,
    spacingAfter = 6,
    repeatTitle = true,
    onPageBreak,
  } = options

  const safeLines = lines.length > 0 ? lines : [getSafeText('', '—')]
  const bodyLineHeightPx = bodyFontSize * lineHeight
  const titleHeight = titleFontSize * 1.1 + 2
  let index = 0
  let isFirstChunk = true

  while (index < safeLines.length) {
    const availableHeight = layout.pageHeight - layout.footerHeight - layout.margin - layout.y
    const titleSpace = title ? titleHeight : 0
    const maxLines = Math.floor((availableHeight - paddingY * 2 - titleSpace) / bodyLineHeightPx)

    if (maxLines <= 0) {
      addNewPage(layout)
      onPageBreak?.()
      continue
    }

    const chunkLines = safeLines.slice(index, index + maxLines)
    const showTitle = title && (isFirstChunk || repeatTitle)
    const chunkTitle = showTitle && !isFirstChunk ? `${title} (continued)` : title
    const chunkTitleHeight = showTitle ? titleHeight : 0
    const boxHeight = paddingY * 2 + chunkTitleHeight + chunkLines.length * bodyLineHeightPx

    drawSectionBox(layout.doc, x, layout.y, width, boxHeight, bgColor, borderColor, 1)

    let textY = layout.y + paddingY
    if (showTitle) {
      layout.doc.setFontSize(titleFontSize)
      layout.doc.setFont(undefined, 'bold')
      layout.doc.setTextColor(titleColor[0], titleColor[1], titleColor[2])
      layout.doc.text(chunkTitle, x + paddingX, textY + titleFontSize)
      textY += chunkTitleHeight
    }

    layout.doc.setFontSize(bodyFontSize)
    layout.doc.setFont(undefined, 'normal')
    layout.doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2])

    chunkLines.forEach((line) => {
      layout.doc.text(line, x + paddingX, textY + bodyFontSize)
      textY += bodyLineHeightPx
    })

    layout.y += boxHeight + spacingAfter
    index += chunkLines.length
    isFirstChunk = false

    if (index < safeLines.length) {
      addNewPage(layout)
      onPageBreak?.()
    }
  }
}

function startSection(
  layout: PdfLayoutContext,
  title: string,
  fontSize: number = 12,
  options?: { iconText?: string; accentColor?: RGBColor }
): void {
  ensureSpace(layout, fontSize + 12)
  layout.y = addSectionHeader(layout.doc, title, layout.y, layout.pageWidth, layout.margin, fontSize, options)
}

function renderSectionText(
  layout: PdfLayoutContext,
  title: string,
  text: string,
  options?: { headerFontSize?: number; fontSize?: number; lineHeight?: number; iconText?: string; accentColor?: RGBColor }
): void {
  const headerFontSize = options?.headerFontSize ?? 12
  const fontSize = options?.fontSize ?? 10
  const lineHeight = options?.lineHeight ?? 1.3
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, title, headerFontSize, {
    iconText: options?.iconText,
    accentColor: options?.accentColor,
  })

  const lines = buildWrappedLines(layout.doc, text, textWidth, fontSize)
  renderLinesBox(layout, lines, {
    x: layout.margin,
    width,
    fontSize,
    lineHeight,
    onPageBreak: () => {
      layout.y = addSectionHeader(
        layout.doc,
        `${title} (continued)`,
        layout.y,
        layout.pageWidth,
        layout.margin,
        headerFontSize,
        { iconText: options?.iconText, accentColor: options?.accentColor }
      )
    },
  })
}

function renderSectionList(
  layout: PdfLayoutContext,
  title: string,
  items: string[],
  options?: { headerFontSize?: number; fontSize?: number; lineHeight?: number; iconText?: string; accentColor?: RGBColor }
): void {
  const headerFontSize = options?.headerFontSize ?? 12
  const fontSize = options?.fontSize ?? 10
  const lineHeight = options?.lineHeight ?? 1.3
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, title, headerFontSize, {
    iconText: options?.iconText,
    accentColor: options?.accentColor,
  })

  const lines = buildBulletedLines(layout.doc, items, textWidth, fontSize)
  renderLinesBox(layout, lines, {
    x: layout.margin,
    width,
    fontSize,
    lineHeight,
    onPageBreak: () => {
      layout.y = addSectionHeader(
        layout.doc,
        `${title} (continued)`,
        layout.y,
        layout.pageWidth,
        layout.margin,
        headerFontSize,
        { iconText: options?.iconText, accentColor: options?.accentColor }
      )
    },
  })
}

function renderSectionListTwoColumn(
  layout: PdfLayoutContext,
  title: string,
  items: string[],
  options?: { headerFontSize?: number; fontSize?: number; lineHeight?: number; iconText?: string; accentColor?: RGBColor }
): void {
  const headerFontSize = options?.headerFontSize ?? 12
  const fontSize = options?.fontSize ?? 10
  const lineHeight = options?.lineHeight ?? 1.3
  const width = layout.pageWidth - 2 * layout.margin
  const columnGap = 12
  const columnWidth = (width - columnGap) / 2
  const textWidth = columnWidth - 16

  startSection(layout, title, headerFontSize, {
    iconText: options?.iconText,
    accentColor: options?.accentColor,
  })

  const lines = buildBulletedLines(layout.doc, items, textWidth, fontSize)
  renderTwoColumnLinesBox(layout, lines, {
    x: layout.margin,
    width,
    fontSize,
    lineHeight,
    columnGap,
    onPageBreak: () => {
      layout.y = addSectionHeader(
        layout.doc,
        `${title} (continued)`,
        layout.y,
        layout.pageWidth,
        layout.margin,
        headerFontSize,
        { iconText: options?.iconText, accentColor: options?.accentColor }
      )
    },
  })
}

/**
 * Helper function to add header to each page
 */
function addHeader(
  doc: jsPDF,
  contentName: string,
  type: string,
  pageNumber: number,
  totalPages: number,
  pageWidth: number,
  margin: number
): void {
  const headerHeight = 15
  const headerY = 0
  
  // Draw header background
  doc.setFillColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setDrawColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setLineWidth(0)
  doc.rect(0, headerY, pageWidth, headerHeight, 'FD')
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.setLineWidth(1)
  doc.line(margin, headerHeight, pageWidth - margin, headerHeight)
  
  // Add content name and type indicator
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
  doc.text(truncateText(contentName, 38), margin, headerY + 8)
  doc.text(`${getTypeLabel(type)} • ${pageNumber}/${totalPages}`, pageWidth - margin, headerY + 8, { align: 'right' })
}

/**
 * Helper function to add footer to each page
 */
function addFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  createdAt: string,
  tags: string[] | undefined,
  notes: string | undefined
): void {
  const footerHeight = 12
  const footerY = pageHeight - footerHeight
  
  // Draw footer background
  doc.setFillColor(COLORS.sectionBg[0], COLORS.sectionBg[1], COLORS.sectionBg[2])
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.5)
  doc.rect(0, footerY, pageWidth, footerHeight, 'FD')
  
  // Add footer text
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  const createdDate = formatDate(createdAt)
  const tagsSummary = tags && tags.length > 0 ? `Tags: ${tags.length}` : ''
  const notesSummary = notes && notes.trim().length > 0 ? 'Notes: yes' : ''
  const summaryText = [tagsSummary, notesSummary].filter(Boolean).join(' • ')
  doc.text(`Created: ${createdDate}`, margin, footerY + 8)
  if (summaryText) {
    doc.text(summaryText, pageWidth / 2, footerY + 8, { align: 'center' })
  }
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY + 8, { align: 'right' })
}

function addSimpleFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
): void {
  const footerY = pageHeight - 8
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  doc.text('SaveYourGoblin', margin, footerY)
  doc.text(`Page ${pageNumber} / ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
}

function addCoverFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  createdAt: string
): void {
  const footerY = pageHeight - 18
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  doc.text(`Created ${formatDate(createdAt)}`, margin, footerY)
  doc.text('SaveYourGoblin', pageWidth - margin, footerY, { align: 'right' })
}

function renderCoverPage(
  doc: jsPDF,
  item: LibraryContentItem,
  pageWidth: number,
  pageHeight: number,
  margin: number
): void {
  drawPageBackground(doc, pageWidth, pageHeight)
  drawPageBorder(doc, pageWidth, pageHeight, margin)

  const ornamentSize = 14
  drawCornerOrnament(doc, margin - 6, margin - 6, ornamentSize)
  drawCornerOrnament(doc, pageWidth - margin - ornamentSize + 6, margin - 6, ornamentSize)
  drawCornerOrnament(doc, margin - 6, pageHeight - margin - ornamentSize + 6, ornamentSize)
  drawCornerOrnament(doc, pageWidth - margin - ornamentSize + 6, pageHeight - margin - ornamentSize + 6, ornamentSize)

  const contentName = getContentName(item)
  const typeLabel = getTypeLabel(item.type)

  doc.setFontSize(28)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  const titleLines = doc.splitTextToSize(contentName, pageWidth - margin * 2 - 20) as string[]
  let titleY = 70
  titleLines.forEach((line) => {
    const lineWidth = doc.getTextWidth(line)
    doc.text(line, (pageWidth - lineWidth) / 2, titleY)
    titleY += 10
  })

  doc.setFontSize(14)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.8)
  doc.line(margin + 20, titleY - 4, pageWidth - margin - 20, titleY - 4)
  doc.text(typeLabel, pageWidth / 2, titleY + 6, { align: 'center' })

  const badges = [
    { text: typeLabel, style: { bgColor: COLORS.primaryHeader, textColor: COLORS.white } },
    { text: `Created ${formatDate(item.created_at)}`, style: { bgColor: COLORS.sectionBg, textColor: COLORS.textPrimary, borderColor: COLORS.border } },
  ]
  if (item.tags && item.tags.length > 0) {
    badges.push({ text: `${item.tags.length} tag${item.tags.length > 1 ? 's' : ''}`, style: { bgColor: COLORS.secondary, textColor: COLORS.white } })
  }
  const badgesY = titleY + 18
  const badgesEndY = renderBadgeGroup(doc, pageWidth / 2 - 120, badgesY, 240, badges, 6)

  const summaryText = getSafeText(item.scenario_input, '')
  if (summaryText) {
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2 - 20)
    let summaryY = badgesEndY + 8
    summaryLines.slice(0, 8).forEach((line: string) => {
      doc.text(line, margin + 10, summaryY)
      summaryY += 6
    })
  }
}

/**
 * Helper function to draw ability score grid for characters
 */
function drawAbilityScoreGrid(
  doc: jsPDF,
  character: Character,
  startY: number,
  pageWidth: number,
  margin: number
): number {
  const boxWidth = (pageWidth - 2 * margin - 25) / 6 // 6 abilities, with spacing
  const boxHeight = 34
  const spacing = 5
  let x = margin
  let y = startY
  
  const abilities = [
    { name: 'STR', value: character.attributes.strength },
    { name: 'DEX', value: character.attributes.dexterity },
    { name: 'CON', value: character.attributes.constitution },
    { name: 'INT', value: character.attributes.intelligence },
    { name: 'WIS', value: character.attributes.wisdom },
    { name: 'CHA', value: character.attributes.charisma },
  ]
  
  abilities.forEach((ability) => {
    // Draw card background
    doc.setFillColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
    doc.setLineWidth(0.8)
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'FD')

    // Accent bar
    doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
    doc.roundedRect(x, y, boxWidth, 6, 2, 2, 'F')
    
    // Add ability name (centered)
    doc.setFontSize(8.5)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    const nameWidth = doc.getTextWidth(ability.name)
    doc.text(ability.name, x + (boxWidth - nameWidth) / 2, y + 5)
    
    // Add ability value (larger, centered, bold)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    const valueText = ability.value.toString()
    const valueWidth = doc.getTextWidth(valueText)
    doc.text(valueText, x + (boxWidth - valueWidth) / 2, y + 22)
    
    // Add modifier calculation hint (small text below)
    const modifier = Math.floor((ability.value - 10) / 2)
    const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    const modWidth = doc.getTextWidth(modifierText)
    doc.text(modifierText, x + (boxWidth - modWidth) / 2, y + 30)
    
    x += boxWidth + spacing
  })
  
  return y + boxHeight + 10
}

export type ContentLinkEntry = {
  id: string
  contentId: string
  linkType: string
  createdAt?: string
  content?: LibraryContentItem | null
}

export type ContentLinks = {
  outgoing: ContentLinkEntry[]
  incoming: ContentLinkEntry[]
}

export type JsonExportOptions = {
  pretty?: boolean
  links?: ContentLinks
}

export type PdfExportLabels = {
  common: {
    levelLabel: string
  }
  character: {
    abilityScoresTitle: string
    abilityScoresSubtitle: string
    skillsTitle: string
    skillsSubtitle: string
    proficiencyBonusTitle: string
    expertiseTitle: string
    expertiseSubtitle: string
    racialTraitsTitle: string
    racialTraitsSubtitle: string
    classFeaturesTitle: string
    classFeaturesSubtitle: string
    traitsTitle: string
    traitsSubtitle: string
    spellsTitle: string
    spellsSubtitle: string
    historyTitle: string
    historySubtitle: string
    personalityTitle: string
    personalitySubtitle: string
    voiceTitle: string
    voiceSubtitle: string
  }
  environment: {
    descriptionTitle: string
    descriptionSubtitle: string
    moodTitle: string
    lightingTitle: string
    ambientTitle: string
    ambientSubtitle: string
    notableFeaturesTitle: string
    notableFeaturesSubtitle: string
    currentConflictTitle: string
    currentConflictSubtitle: string
    presentNPCsTitle: string
    presentNPCsSubtitle: string
    adventureHooksTitle: string
    adventureHooksSubtitle: string
  }
  mission: {
    missionDetailsTitle: string
    missionDetailsSubtitle: string
    missionBriefTitle: string
    missionBriefSubtitle: string
    contextTitle: string
    contextSubtitle: string
    objectivesTitle: string
    objectivesSubtitle: string
    baseRewardsTitle: string
    baseRewardsSubtitle: string
    choiceBasedRewardsTitle: string
    choiceBasedRewardsSubtitle: string
    relatedNPCsTitle: string
    relatedLocationsTitle: string
    powerfulItemsTitle: string
    possibleOutcomesTitle: string
  }
}

export type PdfExportOptions = {
  labels?: PdfExportLabels
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

function buildDefaultPdfLabels(item: LibraryContentItem): PdfExportLabels {
  const character = item.type === 'character' ? (item.content_data as Character) : undefined
  const environment = item.type === 'environment' ? (item.content_data as Environment) : undefined
  const mission = item.type === 'mission' ? (item.content_data as Mission) : undefined

  const skillCount = character?.skills?.length ?? 0
  const expertiseCount = character?.expertise?.length ?? 0
  const racialTraitCount = character?.racialTraits?.length ?? 0
  const classFeatureCount = character?.classFeatures?.length ?? 0
  const traitCount = character?.traits?.length ?? 0
  const spellCount = character?.spells?.length ?? 0

  const featureCount = environment?.features?.length ?? 0
  const npcCount = environment?.npcs?.length ?? 0
  const hookCount = environment?.adventureHooks?.length ?? 0

  const objectiveCount = mission?.objectives?.length ?? 0
  const powerfulItemCount = mission?.powerfulItems?.length ?? 0
  const outcomeCount = mission?.possibleOutcomes?.length ?? 0

  return {
    common: {
      levelLabel: 'Level',
    },
    character: {
      abilityScoresTitle: 'Attributes',
      abilityScoresSubtitle: 'Core attributes',
      skillsTitle: 'Skills',
      skillsSubtitle: `${skillCount} ${pluralize(skillCount, 'skill', 'skills')}`,
      proficiencyBonusTitle: 'Proficiency Bonus',
      expertiseTitle: 'Expertise',
      expertiseSubtitle: `${expertiseCount} ${pluralize(expertiseCount, 'skill', 'skills')}`,
      racialTraitsTitle: 'Racial Traits',
      racialTraitsSubtitle: `${racialTraitCount} ${pluralize(racialTraitCount, 'trait', 'traits')}`,
      classFeaturesTitle: 'Class Features',
      classFeaturesSubtitle: `${classFeatureCount} ${pluralize(classFeatureCount, 'feature', 'features')}`,
      traitsTitle: 'Traits',
      traitsSubtitle: `${traitCount} ${pluralize(traitCount, 'trait', 'traits')}`,
      spellsTitle: 'Spells',
      spellsSubtitle: `${spellCount} ${pluralize(spellCount, 'spell', 'spells')}`,
      historyTitle: 'History',
      historySubtitle: 'Character backstory',
      personalityTitle: 'Personality',
      personalitySubtitle: 'Character demeanor',
      voiceTitle: 'Voice',
      voiceSubtitle: 'Voice characteristics',
    },
    environment: {
      descriptionTitle: 'Description',
      descriptionSubtitle: 'Location details',
      moodTitle: 'Mood',
      lightingTitle: 'Lighting',
      ambientTitle: 'Ambient Atmosphere',
      ambientSubtitle: 'Sounds and atmosphere',
      notableFeaturesTitle: 'Notable Features',
      notableFeaturesSubtitle: `${featureCount} ${pluralize(featureCount, 'feature', 'features')}`,
      currentConflictTitle: 'Current Conflict',
      currentConflictSubtitle: 'Active issues',
      presentNPCsTitle: 'Present NPCs',
      presentNPCsSubtitle: `${npcCount} ${pluralize(npcCount, 'NPC', 'NPCs')}`,
      adventureHooksTitle: 'Adventure Hooks',
      adventureHooksSubtitle: `${hookCount} ${pluralize(hookCount, 'hook', 'hooks')}`,
    },
    mission: {
      missionDetailsTitle: 'Mission Details',
      missionDetailsSubtitle: 'Mission details',
      missionBriefTitle: 'Mission Brief',
      missionBriefSubtitle: 'Mission overview',
      contextTitle: 'Context',
      contextSubtitle: 'Situation details',
      objectivesTitle: 'Objectives',
      objectivesSubtitle: `${objectiveCount} ${pluralize(objectiveCount, 'objective', 'objectives')}`,
      baseRewardsTitle: 'Base Rewards',
      baseRewardsSubtitle: 'Mission completion rewards',
      choiceBasedRewardsTitle: 'Choice-Based Rewards',
      choiceBasedRewardsSubtitle: '',
      relatedNPCsTitle: 'Related NPCs',
      relatedLocationsTitle: 'Related Locations',
      powerfulItemsTitle: 'Powerful Items',
      possibleOutcomesTitle: 'Possible Outcomes',
    },
  }
}

function buildHeaderBadges(item: LibraryContentItem, labels: PdfExportLabels): { badges: HeaderBadge[]; iconText: string } {
  if (item.type === 'character') {
    const character = item.content_data as Character
    const badges: HeaderBadge[] = [
      { text: truncateText(character.race, 18), style: { bgColor: COLORS.emerald, textColor: COLORS.black } },
      { text: truncateText(character.class, 18), style: { bgColor: COLORS.indigo, textColor: COLORS.white } },
      { text: `${labels.common.levelLabel} ${character.level}`, style: { bgColor: COLORS.amber, textColor: COLORS.black } },
      { text: truncateText(character.background, 22), style: { bgColor: COLORS.sectionBg, textColor: COLORS.textPrimary, borderColor: COLORS.cardBorder } },
    ]
    if (character.voiceDescription) {
      badges.push({ text: truncateText(character.voiceDescription, 22), style: { bgColor: COLORS.sectionBg, textColor: COLORS.textSecondary, borderColor: COLORS.cardBorder } })
    }
    return {
      badges,
      iconText: character.class ? character.class.charAt(0).toUpperCase() : 'C',
    }
  }

  if (item.type === 'environment') {
    const environment = item.content_data as Environment
    const badges: HeaderBadge[] = [
      { text: getTypeLabel(item.type), style: { bgColor: COLORS.secondary, textColor: COLORS.white } },
    ]
    if (environment.mood) {
      badges.push({ text: `${labels.environment.moodTitle}: ${truncateText(environment.mood, 18)}`, style: { bgColor: COLORS.purple, textColor: COLORS.white } })
    }
    if (environment.lighting) {
      badges.push({ text: `${labels.environment.lightingTitle}: ${truncateText(environment.lighting, 18)}`, style: { bgColor: COLORS.yellow, textColor: COLORS.black } })
    }
    return { badges, iconText: '' }
  }

  const mission = item.content_data as Mission
  const badges: HeaderBadge[] = [
    { text: getTypeLabel(item.type), style: { bgColor: COLORS.secondary, textColor: COLORS.white } },
  ]
  if (mission.difficulty) {
    const diffColor = mission.difficulty === 'easy'
      ? COLORS.green
      : mission.difficulty === 'hard'
        ? COLORS.orange
        : mission.difficulty === 'deadly'
          ? COLORS.warning
          : COLORS.yellow
    badges.push({ text: mission.difficulty, style: { bgColor: diffColor, textColor: COLORS.black } })
  }
  if (mission.recommendedLevel) {
    badges.push({ text: truncateText(mission.recommendedLevel, 18), style: { bgColor: COLORS.sectionBg, textColor: COLORS.textPrimary, borderColor: COLORS.cardBorder } })
  }
  return { badges, iconText: '' }
}

/**
 * Export content as JSON file
 */
export function exportAsJSON(item: LibraryContentItem, options: JsonExportOptions = {}): void {
  const { pretty = true, links } = options
  const data = {
    id: item.id,
    type: item.type,
    scenario_input: item.scenario_input,
    content_data: item.content_data,
    tags: item.tags || [],
    notes: item.notes || '',
    created_at: item.created_at,
    is_favorite: item.is_favorite || false,
    ...(links ? { links } : {}),
  }

  const jsonString = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${getContentName(item)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export content as PDF file
 */
export function exportAsPDF(item: LibraryContentItem, options: PdfExportOptions = {}): void {
  const doc = new jsPDF()
  doc.setFont('times', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const footerHeight = 10
  const contentName = getContentName(item)
  const labels = options.labels ?? buildDefaultPdfLabels(item)

  doc.setProperties({
    title: contentName,
    subject: getTypeLabel(item.type),
    author: 'SaveYourGoblin',
    creator: 'SaveYourGoblin',
    keywords: (item.tags || []).join(', '),
  })

  const layout: PdfLayoutContext = {
    doc,
    pageWidth,
    pageHeight,
    margin,
    headerHeight: 0,
    footerHeight,
    contentStartY: margin,
    y: margin,
    currentPage: 1,
  }

  const headerBadges = buildHeaderBadges(item, labels)
  layout.renderPageHeader = (ctx) => {
    renderHeaderBlock(ctx, contentName, headerBadges.badges, headerBadges.iconText)
  }

  drawPageBackground(doc, pageWidth, pageHeight)
  drawPageBorder(doc, pageWidth, pageHeight, margin)
  layout.renderPageHeader(layout)

  if (item.type === 'character') {
    renderCharacterToPDF(layout, item.content_data as Character, labels)
  } else if (item.type === 'environment') {
    exportEnvironmentToPDF(layout, item.content_data as Environment, labels)
  } else if (item.type === 'mission') {
    exportMissionToPDF(layout, item.content_data as Mission, labels)
  }

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    addSimpleFooter(doc, page, totalPages, pageWidth, pageHeight, margin)
  }

  doc.save(`${contentName}.pdf`)
}

const SKILL_ABILITY_MAP: Record<string, string> = {
  Acrobatics: 'DEX',
  'Animal Handling': 'WIS',
  Arcana: 'INT',
  Athletics: 'STR',
  Deception: 'CHA',
  History: 'INT',
  Insight: 'WIS',
  Intimidation: 'CHA',
  Investigation: 'INT',
  Medicine: 'WIS',
  Nature: 'INT',
  Perception: 'WIS',
  Performance: 'CHA',
  Persuasion: 'CHA',
  Religion: 'INT',
  'Sleight of Hand': 'DEX',
  Stealth: 'DEX',
  Survival: 'WIS',
}

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function renderAttributeCard(
  layout: PdfLayoutContext,
  x: number,
  y: number,
  width: number,
  character: Character,
  labels: PdfExportLabels
): number {
  const abilities = [
    { name: 'STR', value: character.attributes.strength, color: COLORS.rose },
    { name: 'DEX', value: character.attributes.dexterity, color: COLORS.green },
    { name: 'CON', value: character.attributes.constitution, color: COLORS.orange },
    { name: 'INT', value: character.attributes.intelligence, color: COLORS.blue },
    { name: 'WIS', value: character.attributes.wisdom, color: COLORS.purple },
    { name: 'CHA', value: character.attributes.charisma, color: COLORS.yellow },
  ]
  const headerHeight = getCardHeaderHeight(labels.character.abilityScoresSubtitle)
  const rowHeight = 8
  const contentHeight = abilities.length * rowHeight + 18
  const cardHeight = headerHeight + contentHeight + 6

  drawCardContainer(layout.doc, x, y, width, cardHeight, COLORS.rose)
  drawCardHeader(layout.doc, x, y, width, {
    title: labels.character.abilityScoresTitle,
    subtitle: labels.character.abilityScoresSubtitle,
    icon: '',
    count: abilities.length,
    accentColor: COLORS.rose,
  })

  let rowY = y + headerHeight + 6
  const barMaxWidth = width - 22
  abilities.forEach((ability) => {
    const modifier = getModifier(ability.value)
    layout.doc.setFontSize(8)
    layout.doc.setFont(undefined, 'bold')
    layout.doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    layout.doc.text(ability.name, x + 6, rowY + 6)
    layout.doc.setFont(undefined, 'normal')
    layout.doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    layout.doc.text(`${ability.value} ${formatModifier(modifier)}`, x + width - 12, rowY + 6, { align: 'right' })

    const barWidth = Math.max(8, (ability.value / 20) * barMaxWidth)
    layout.doc.setFillColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
    layout.doc.rect(x + 6, rowY + 7, barMaxWidth, 1.6, 'F')
    layout.doc.setFillColor(ability.color[0], ability.color[1], ability.color[2])
    layout.doc.rect(x + 6, rowY + 7, barWidth, 1.6, 'F')

    rowY += rowHeight
  })

  const proficiencyBonus = Math.floor((character.level + 7) / 4)
  layout.doc.setFillColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  layout.doc.roundedRect(x + 6, rowY + 2, width - 12, 12, 2, 2, 'F')
  layout.doc.setFontSize(7)
  layout.doc.setFont(undefined, 'normal')
  layout.doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  layout.doc.text(labels.character.proficiencyBonusTitle, x + 10, rowY + 9)
  layout.doc.setFontSize(12)
  layout.doc.setFont(undefined, 'bold')
  layout.doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  layout.doc.text(formatModifier(proficiencyBonus), x + width - 10, rowY + 11, { align: 'right' })

  return cardHeight
}

function buildSkillLines(character: Character): string[] {
  const expertiseSet = new Set(character.expertise || [])
  return (character.skills || []).map((skill) => {
    const marker = expertiseSet.has(skill.name) ? '★' : skill.proficiency ? '•' : '○'
    const ability = SKILL_ABILITY_MAP[skill.name] ?? ''
    const mod = formatModifier(skill.modifier)
    return `${marker} ${skill.name} ${ability ? `(${ability})` : ''} ${mod}`.trim()
  })
}

function renderCharacterToPDF(layout: PdfLayoutContext, character: Character, labels: PdfExportLabels): void {
  const gap = 6
  const width = layout.pageWidth - 2 * layout.margin
  const columnWidth = (width - gap * 2) / 3
  const columnTopY = layout.y
  const columnHeight = layout.pageHeight - layout.footerHeight - layout.margin - columnTopY

  const leftX = layout.margin
  const middleX = layout.margin + columnWidth + gap
  const rightX = layout.margin + (columnWidth + gap) * 2

  renderAttributeCard(layout, leftX, columnTopY, columnWidth, character, labels)

  const skillLines = buildSkillLines(character)
  const skillResult = renderCardLinesInColumn({
    doc: layout.doc,
    x: middleX,
    y: columnTopY,
    width: columnWidth,
    maxHeight: columnHeight,
    title: labels.character.skillsTitle,
    subtitle: labels.character.skillsSubtitle,
    icon: '',
    count: skillLines.length,
    accentColor: COLORS.cyan,
    lines: buildWrappedLinesFromList(layout.doc, skillLines, columnWidth - 14, 8),
    fontSize: 8,
    lineHeight: 1.2,
  })

  const overflowSections: Array<CardHeaderOptions & { lines: string[] }> = []
  let rightY = columnTopY
  const rightAvailable = columnHeight
  const rightSections: Array<CardHeaderOptions & { lines: string[] }> = []

  if (character.expertise && character.expertise.length > 0) {
    rightSections.push({
      title: labels.character.expertiseTitle,
      subtitle: labels.character.expertiseSubtitle,
      icon: '',
      count: character.expertise.length,
      accentColor: COLORS.blue,
      lines: buildBulletedLines(layout.doc, character.expertise, columnWidth - 14, 8),
    })
  }

  if (character.racialTraits && character.racialTraits.length > 0) {
    rightSections.push({
      title: labels.character.racialTraitsTitle,
      subtitle: labels.character.racialTraitsSubtitle,
      icon: '',
      count: character.racialTraits.length,
      accentColor: COLORS.purple,
      lines: buildBulletedLines(layout.doc, character.racialTraits, columnWidth - 14, 8),
    })
  }

  if (character.classFeatures && character.classFeatures.length > 0) {
    const featureLines = character.classFeatures.map(
      (feature) => `${feature.name} (${labels.common.levelLabel} ${feature.level}) - ${feature.description}`
    )
    rightSections.push({
      title: labels.character.classFeaturesTitle,
      subtitle: labels.character.classFeaturesSubtitle,
      icon: '',
      count: character.classFeatures.length,
      accentColor: COLORS.indigo,
      lines: buildWrappedLinesFromList(layout.doc, featureLines, columnWidth - 14, 8),
    })
  }

  if (character.traits && character.traits.length > 0) {
    rightSections.push({
      title: labels.character.traitsTitle,
      subtitle: labels.character.traitsSubtitle,
      icon: '',
      count: character.traits.length,
      accentColor: COLORS.emerald,
      lines: buildBulletedLines(layout.doc, character.traits, columnWidth - 14, 8),
    })
  }

  rightSections.forEach((section) => {
    const remainingHeight = rightAvailable - (rightY - columnTopY)
    const minHeight = getCardHeaderHeight(section.subtitle) + 12
    if (remainingHeight < minHeight) {
      overflowSections.push(section)
      return
    }
    const result = renderCardLinesInColumn({
      doc: layout.doc,
      x: rightX,
      y: rightY,
      width: columnWidth,
      maxHeight: remainingHeight,
      title: section.title,
      subtitle: section.subtitle,
      icon: section.icon,
      count: section.count,
      accentColor: section.accentColor,
      lines: section.lines,
      fontSize: 8,
      lineHeight: 1.2,
    })
    rightY += result.usedHeight
    if (result.remainingLines.length > 0) {
      overflowSections.push({ ...section, lines: result.remainingLines })
    }
  })

  if (skillResult.remainingLines.length > 0) {
    overflowSections.push({
      title: labels.character.skillsTitle,
      subtitle: labels.character.skillsSubtitle,
      icon: '',
      count: skillLines.length,
      accentColor: COLORS.cyan,
      lines: skillResult.remainingLines,
    })
  }

  addNewPage(layout)

  overflowSections.forEach((section) => {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: section.title,
      subtitle: section.subtitle,
      icon: section.icon,
      count: section.count,
      accentColor: section.accentColor,
      lines: section.lines,
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  })

  if (character.spells && character.spells.length > 0) {
    const spellLines = character.spells.map(
      (spell) => `${spell.name} (${labels.common.levelLabel} ${spell.level}) — ${spell.description}`
    )
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.character.spellsTitle,
      subtitle: labels.character.spellsSubtitle,
      icon: '',
      count: character.spells.length,
      accentColor: COLORS.indigo,
      lines: buildWrappedLinesFromList(layout.doc, spellLines, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.character.historyTitle,
    subtitle: labels.character.historySubtitle,
    icon: '',
    accentColor: COLORS.amber,
    lines: buildWrappedLines(layout.doc, character.history, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.character.personalityTitle,
    subtitle: labels.character.personalitySubtitle,
    icon: '',
    accentColor: COLORS.pink,
    lines: buildWrappedLines(layout.doc, character.personality, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  if (character.voiceDescription) {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.character.voiceTitle,
      subtitle: labels.character.voiceSubtitle,
      icon: '',
      accentColor: COLORS.cyan,
      lines: buildWrappedLines(layout.doc, character.voiceDescription, width - 14, 9),
      fontSize: 9,
      lineHeight: 1.3,
    })
  }
}

function exportEnvironmentToPDF(layout: PdfLayoutContext, environment: Environment, labels: PdfExportLabels): void {
  const width = layout.pageWidth - 2 * layout.margin

  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.environment.descriptionTitle,
    subtitle: labels.environment.descriptionSubtitle,
    icon: '',
    accentColor: COLORS.blue,
    lines: buildWrappedLines(layout.doc, environment.description, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.environment.moodTitle,
    icon: '',
    accentColor: COLORS.purple,
    lines: buildWrappedLines(layout.doc, environment.mood, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.environment.lightingTitle,
    icon: '',
    accentColor: COLORS.yellow,
    lines: buildWrappedLines(layout.doc, environment.lighting, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.environment.ambientTitle,
    subtitle: labels.environment.ambientSubtitle,
    icon: '',
    accentColor: COLORS.cyan,
    lines: buildWrappedLines(layout.doc, environment.ambient, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  if (environment.features && environment.features.length > 0) {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.environment.notableFeaturesTitle,
      subtitle: labels.environment.notableFeaturesSubtitle,
      icon: '',
      count: environment.features.length,
      accentColor: COLORS.emerald,
      lines: buildBulletedLines(layout.doc, environment.features, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  if (environment.npcs && environment.npcs.length > 0) {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.environment.presentNPCsTitle,
      subtitle: labels.environment.presentNPCsSubtitle,
      icon: '',
      count: environment.npcs.length,
      accentColor: COLORS.blue,
      lines: buildBulletedLines(layout.doc, environment.npcs, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  if (environment.currentConflict) {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.environment.currentConflictTitle,
      subtitle: labels.environment.currentConflictSubtitle,
      icon: '',
      accentColor: COLORS.warning,
      lines: buildWrappedLines(layout.doc, environment.currentConflict, width - 14, 9),
      fontSize: 9,
      lineHeight: 1.3,
    })
  }

  if (environment.adventureHooks && environment.adventureHooks.length > 0) {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.environment.adventureHooksTitle,
      subtitle: labels.environment.adventureHooksSubtitle,
      icon: '',
      count: environment.adventureHooks.length,
      accentColor: COLORS.secondary,
      lines: buildBulletedLines(layout.doc, environment.adventureHooks, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }
}

function exportMissionToPDF(layout: PdfLayoutContext, mission: Mission, labels: PdfExportLabels): void {
  const width = layout.pageWidth - 2 * layout.margin

  const detailLines = [
    `${labels.common.levelLabel}: ${mission.recommendedLevel || '—'}`,
    `Difficulty: ${mission.difficulty}`,
  ]
  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.mission.missionDetailsTitle,
    subtitle: labels.mission.missionDetailsSubtitle,
    icon: '',
    accentColor: COLORS.secondary,
    lines: buildWrappedLinesFromList(layout.doc, detailLines, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.mission.missionBriefTitle,
    subtitle: labels.mission.missionBriefSubtitle,
    icon: '',
    accentColor: COLORS.blue,
    lines: buildWrappedLines(layout.doc, mission.description, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  renderCardLines(layout, {
    x: layout.margin,
    width,
    title: labels.mission.contextTitle,
    subtitle: labels.mission.contextSubtitle,
    icon: '',
    accentColor: COLORS.cyan,
    lines: buildWrappedLines(layout.doc, mission.context, width - 14, 9),
    fontSize: 9,
    lineHeight: 1.3,
  })

  if (mission.objectives && mission.objectives.length > 0) {
    const objectiveLines = mission.objectives.map((obj) => {
      const prefix = obj.primary ? '★' : '○'
      const path = obj.pathType ? ` (${obj.pathType})` : ''
      return `${prefix} ${obj.description}${path}`
    })
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.mission.objectivesTitle,
      subtitle: labels.mission.objectivesSubtitle,
      icon: '',
      count: mission.objectives.length,
      accentColor: COLORS.orange,
      lines: buildWrappedLinesFromList(layout.doc, objectiveLines, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  if (mission.rewards) {
    const rewardLines: string[] = []
    if (mission.rewards.xp) rewardLines.push(`XP: ${mission.rewards.xp}`)
    if (mission.rewards.gold) rewardLines.push(`Gold: ${mission.rewards.gold}`)
    if (mission.rewards.items && mission.rewards.items.length > 0) {
      rewardLines.push(...mission.rewards.items.map((item) => `• ${item}`))
    }
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.mission.baseRewardsTitle,
      subtitle: labels.mission.baseRewardsSubtitle,
      icon: '',
      accentColor: COLORS.green,
      lines: buildWrappedLinesFromList(layout.doc, rewardLines, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  if (mission.choiceBasedRewards && mission.choiceBasedRewards.length > 0) {
    const rewardLines = mission.choiceBasedRewards.flatMap((choice) => {
      const lines = [`If ${choice.condition}:`]
      if (choice.rewards.xp) lines.push(`XP: ${choice.rewards.xp}`)
      if (choice.rewards.gold) lines.push(`Gold: ${choice.rewards.gold}`)
      if (choice.rewards.items && choice.rewards.items.length > 0) {
        choice.rewards.items.forEach((item) => lines.push(`• ${item}`))
      }
      return lines
    })
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.mission.choiceBasedRewardsTitle,
      subtitle: labels.mission.choiceBasedRewardsSubtitle,
      icon: '',
      count: mission.choiceBasedRewards.length,
      accentColor: COLORS.indigo,
      lines: buildWrappedLinesFromList(layout.doc, rewardLines, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  if (mission.relatedNPCs && mission.relatedNPCs.length > 0) {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.mission.relatedNPCsTitle,
      icon: '',
      count: mission.relatedNPCs.length,
      accentColor: COLORS.blue,
      lines: buildBulletedLines(layout.doc, mission.relatedNPCs, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  if (mission.relatedLocations && mission.relatedLocations.length > 0) {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.mission.relatedLocationsTitle,
      icon: '',
      count: mission.relatedLocations.length,
      accentColor: COLORS.purple,
      lines: buildBulletedLines(layout.doc, mission.relatedLocations, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  if (mission.powerfulItems && mission.powerfulItems.length > 0) {
    const itemLines = mission.powerfulItems.map((item) => `${item.name} — ${item.status}`)
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.mission.powerfulItemsTitle,
      icon: '',
      count: mission.powerfulItems.length,
      accentColor: COLORS.amber,
      lines: buildWrappedLinesFromList(layout.doc, itemLines, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }

  if (mission.possibleOutcomes && mission.possibleOutcomes.length > 0) {
    renderCardLines(layout, {
      x: layout.margin,
      width,
      title: labels.mission.possibleOutcomesTitle,
      icon: '',
      count: mission.possibleOutcomes.length,
      accentColor: COLORS.secondary,
      lines: buildBulletedLines(layout.doc, mission.possibleOutcomes, width - 14, 8.5),
      fontSize: 8.5,
      lineHeight: 1.25,
    })
  }
}

/**
 * Helper function to get content name
 */
function getContentName(item: LibraryContentItem): string {
  if (item.type === 'character') {
    return (item.content_data as Character).name
  } else if (item.type === 'environment') {
    return (item.content_data as Environment).name
  } else {
    return (item.content_data as Mission).title
  }
}

/**
 * Helper function to get type label
 */
function getTypeLabel(type: string): string {
  switch (type) {
    case 'character':
      return 'Character/NPC'
    case 'environment':
      return 'Environment'
    case 'mission':
      return 'Mission'
    default:
      return 'Content'
  }
}

/**
 * Helper function to format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
