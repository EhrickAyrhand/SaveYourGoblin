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
  parchmentBg: RGBColor
  parchmentBorder: RGBColor
  accent: RGBColor
  white: RGBColor
  black: RGBColor
} = {
  primaryHeader: [92, 64, 40],       // deep brown
  secondary: [176, 118, 63],         // warm amber
  sectionBg: [253, 246, 232],        // parchment light
  border: [201, 176, 130],           // parchment border
  textPrimary: [61, 45, 32],         // ink brown
  textSecondary: [118, 93, 67],      // muted ink
  success: [55, 120, 84],            // muted green
  warning: [153, 63, 46],            // muted red
  parchmentBg: [250, 242, 224],
  parchmentBorder: [191, 161, 115],
  accent: [120, 82, 49],
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
}

function addNewPage(layout: PdfLayoutContext): void {
  layout.doc.addPage()
  drawPageBackground(layout.doc, layout.pageWidth, layout.pageHeight)
  drawPageBorder(layout.doc, layout.pageWidth, layout.pageHeight, layout.margin)
  layout.currentPage += 1
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
  doc.setFillColor(COLORS.parchmentBg[0], COLORS.parchmentBg[1], COLORS.parchmentBg[2])
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
}

function drawPageBorder(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number): void {
  doc.setDrawColor(COLORS.parchmentBorder[0], COLORS.parchmentBorder[1], COLORS.parchmentBorder[2])
  doc.setLineWidth(0.6)
  doc.rect(margin - 4, margin - 4, pageWidth - (margin - 4) * 2, pageHeight - (margin - 4) * 2, 'D')
}

function drawCornerOrnament(doc: jsPDF, x: number, y: number, size: number): void {
  doc.setDrawColor(COLORS.parchmentBorder[0], COLORS.parchmentBorder[1], COLORS.parchmentBorder[2])
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
export function exportAsPDF(item: LibraryContentItem): void {
  const doc = new jsPDF()
  doc.setFont('times', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const headerHeight = 15
  const footerHeight = 12
  const contentStartY = margin + headerHeight + 5
  const contentName = getContentName(item)

  doc.setProperties({
    title: contentName,
    subject: getTypeLabel(item.type),
    author: 'SaveYourGoblin',
    creator: 'SaveYourGoblin',
    keywords: (item.tags || []).join(', '),
  })

  renderCoverPage(doc, item, pageWidth, pageHeight, margin)

  doc.addPage()
  drawPageBackground(doc, pageWidth, pageHeight)
  drawPageBorder(doc, pageWidth, pageHeight, margin)

  const layout: PdfLayoutContext = {
    doc,
    pageWidth,
    pageHeight,
    margin,
    headerHeight,
    footerHeight,
    contentStartY,
    y: contentStartY,
    currentPage: 2,
  }

  if (item.tags && item.tags.length > 0) {
    startSection(layout, 'Tags', 12, { iconText: 'T', accentColor: COLORS.secondary })
    const badges = item.tags.map((tag) => ({
      text: tag,
      style: { bgColor: COLORS.sectionBg, borderColor: COLORS.border, textColor: COLORS.textPrimary },
    }))
    const badgesHeight = renderBadgeGroup(doc, margin + 8, layout.y + 4, pageWidth - 2 * margin - 16, badges, 4)
    layout.y = badgesHeight + 6
  }

  renderSectionText(layout, 'Original Scenario', item.scenario_input, {
    fontSize: 10,
    iconText: 'S',
    accentColor: COLORS.secondary,
  })

  if (item.notes && item.notes.trim().length > 0) {
    renderSectionText(layout, 'Notes', item.notes, {
      fontSize: 10,
      iconText: 'N',
      accentColor: COLORS.accent,
    })
  }

  layout.y += 5
  if (item.type === 'character') {
    exportCharacterToPDF(layout, item.content_data as Character)
  } else if (item.type === 'environment') {
    exportEnvironmentToPDF(layout, item.content_data as Environment)
  } else if (item.type === 'mission') {
    exportMissionToPDF(layout, item.content_data as Mission)
  }

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    if (page === 1) {
      addCoverFooter(doc, pageWidth, pageHeight, margin, item.created_at)
    } else {
      const contentPage = page - 1
      const contentTotalPages = totalPages - 1
      addHeader(doc, contentName, item.type, contentPage, contentTotalPages, pageWidth, margin)
      addFooter(doc, contentPage, contentTotalPages, pageWidth, pageHeight, margin, item.created_at, item.tags, item.notes)
    }
  }

  doc.save(`${contentName}.pdf`)
}

function exportCharacterToPDF(layout: PdfLayoutContext, character: Character): void {
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, 'Character Details', 14, { iconText: 'C', accentColor: COLORS.secondary })
  ensureSpace(layout, 42)
  const detailCardHeight = 36
  drawSectionBox(layout.doc, layout.margin, layout.y, width, detailCardHeight, COLORS.sectionBg, COLORS.border, 1)
  layout.doc.setFontSize(12)
  layout.doc.setFont(undefined, 'bold')
  layout.doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  layout.doc.text(character.name, layout.margin + 10, layout.y + 14)

  const badgeItems = [
    { text: character.race, style: { bgColor: COLORS.secondary, textColor: COLORS.white } },
    { text: character.class, style: { bgColor: COLORS.primaryHeader, textColor: COLORS.white } },
    { text: `Level ${character.level}`, style: { bgColor: COLORS.sectionBg, textColor: COLORS.textPrimary, borderColor: COLORS.border } },
    { text: character.background, style: { bgColor: COLORS.sectionBg, textColor: COLORS.textPrimary, borderColor: COLORS.border } },
  ]
  renderBadgeGroup(layout.doc, layout.margin + 10, layout.y + 18, width - 20, badgeItems, 2)
  layout.y += detailCardHeight + 8

  startSection(layout, 'Ability Scores', 14, { iconText: 'A', accentColor: COLORS.secondary })
  const abilityPageBreak = ensureSpace(layout, 40)
  if (abilityPageBreak) {
    layout.y = addSectionHeader(
      layout.doc,
      'Ability Scores (continued)',
      layout.y,
      layout.pageWidth,
      layout.margin,
      14,
      { iconText: 'A', accentColor: COLORS.secondary }
    )
  }
  layout.y = drawAbilityScoreGrid(layout.doc, character, layout.y, layout.pageWidth, layout.margin)
  layout.y += 5

  renderSectionText(layout, 'History', character.history, { fontSize: 10, iconText: 'H', accentColor: COLORS.accent })
  renderSectionText(layout, 'Personality', character.personality, { fontSize: 10, iconText: 'P', accentColor: COLORS.accent })
  renderSectionText(layout, 'Voice', character.voiceDescription, { fontSize: 10, iconText: 'V', accentColor: COLORS.accent })

  if (character.traits && character.traits.length > 0) {
    renderSectionListTwoColumn(layout, 'Traits', character.traits, { fontSize: 10, iconText: 'T', accentColor: COLORS.secondary })
  }

  if (character.racialTraits && character.racialTraits.length > 0) {
    renderSectionListTwoColumn(layout, 'Racial Traits', character.racialTraits, { fontSize: 10, iconText: 'R', accentColor: COLORS.secondary })
  }

  if (character.expertise && character.expertise.length > 0) {
    renderSectionListTwoColumn(layout, 'Expertise', character.expertise, { fontSize: 10, iconText: 'E', accentColor: COLORS.secondary })
  }

  const equipment = (character as Character & { equipment?: string[] }).equipment
  if (equipment && equipment.length > 0) {
    renderSectionListTwoColumn(layout, 'Equipment', equipment, { fontSize: 10, iconText: 'Q', accentColor: COLORS.secondary })
  }

  if (character.classFeatures && character.classFeatures.length > 0) {
    startSection(layout, 'Class Features', 12, { iconText: 'F', accentColor: COLORS.secondary })
    character.classFeatures.forEach((feature) => {
      const lines = buildWrappedLines(layout.doc, feature.description, textWidth, 9)
      renderTitledLinesBox(layout, {
        x: layout.margin,
        width,
        title: `${feature.name} (Level ${feature.level})`,
        lines,
        titleFontSize: 10,
        bodyFontSize: 9,
        onPageBreak: () => {
          layout.y = addSectionHeader(
            layout.doc,
            'Class Features (continued)',
            layout.y,
            layout.pageWidth,
            layout.margin,
            12,
            { iconText: 'F', accentColor: COLORS.secondary }
          )
        },
      })
    })
  }

  if (character.skills && character.skills.length > 0) {
    const expertiseSet = new Set(character.expertise || [])
    const skillLines = character.skills.map((skill) => {
      const mod = skill.modifier >= 0 ? `+${skill.modifier}` : `${skill.modifier}`
      const proficiencyLabel = expertiseSet.has(skill.name)
        ? 'Expertise'
        : skill.proficiency
          ? 'Proficient'
          : ''
      const suffix = proficiencyLabel ? `, ${proficiencyLabel}` : ''
      return `${skill.name} (${mod}${suffix})`
    })
    renderSectionListTwoColumn(layout, 'Skills', skillLines, { fontSize: 10, iconText: 'S', accentColor: COLORS.secondary })
  }

  if (character.spells && character.spells.length > 0) {
    startSection(layout, 'Spells', 12, { iconText: 'M', accentColor: COLORS.secondary })
    character.spells.forEach((spell) => {
      const lines = buildWrappedLines(layout.doc, spell.description, textWidth, 9)
      renderTitledLinesBox(layout, {
        x: layout.margin,
        width,
        title: `${spell.name} (Level ${spell.level})`,
        lines,
        titleFontSize: 10,
        bodyFontSize: 9,
        onPageBreak: () => {
          layout.y = addSectionHeader(
            layout.doc,
            'Spells (continued)',
            layout.y,
            layout.pageWidth,
            layout.margin,
            12,
            { iconText: 'M', accentColor: COLORS.secondary }
          )
        },
      })
    })
  }
}

function exportEnvironmentToPDF(layout: PdfLayoutContext, environment: Environment): void {
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, 'Environment Details', 14, { iconText: 'E', accentColor: COLORS.secondary })
  ensureSpace(layout, 34)
  const detailCardHeight = 28
  drawSectionBox(layout.doc, layout.margin, layout.y, width, detailCardHeight, COLORS.sectionBg, COLORS.border, 1)
  layout.doc.setFontSize(12)
  layout.doc.setFont(undefined, 'bold')
  layout.doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  layout.doc.text(environment.name, layout.margin + 10, layout.y + 16)
  layout.y += detailCardHeight + 8

  renderSectionText(layout, 'Description', environment.description, { fontSize: 10, iconText: 'D', accentColor: COLORS.accent })
  renderSectionText(layout, 'Mood', environment.mood, { fontSize: 10, iconText: 'M', accentColor: COLORS.accent })
  renderSectionText(layout, 'Lighting', environment.lighting, { fontSize: 10, iconText: 'L', accentColor: COLORS.accent })
  renderSectionText(layout, 'Ambient Atmosphere', environment.ambient, { fontSize: 10, iconText: 'A', accentColor: COLORS.accent })

  if (environment.features && environment.features.length > 0) {
    renderSectionListTwoColumn(layout, 'Notable Features', environment.features, { fontSize: 10, iconText: 'F', accentColor: COLORS.secondary })
  }

  if (environment.npcs && environment.npcs.length > 0) {
    renderSectionListTwoColumn(layout, 'Present NPCs', environment.npcs, { fontSize: 10, iconText: 'N', accentColor: COLORS.secondary })
  }

  if (environment.currentConflict) {
    renderSectionText(layout, 'Current Conflict', environment.currentConflict, { fontSize: 10, iconText: 'C', accentColor: COLORS.warning })
  }

  if (environment.adventureHooks && environment.adventureHooks.length > 0) {
    renderSectionListTwoColumn(layout, 'Adventure Hooks', environment.adventureHooks, { fontSize: 10, iconText: 'H', accentColor: COLORS.secondary })
  }
}

function exportMissionToPDF(layout: PdfLayoutContext, mission: Mission): void {
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, 'Mission Details', 14, { iconText: 'M', accentColor: COLORS.secondary })
  ensureSpace(layout, 40)
  const detailCardHeight = 34
  drawSectionBox(layout.doc, layout.margin, layout.y, width, detailCardHeight, COLORS.sectionBg, COLORS.border, 1)
  layout.doc.setFontSize(12)
  layout.doc.setFont(undefined, 'bold')
  layout.doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  layout.doc.text(mission.title, layout.margin + 10, layout.y + 14)

  const difficultyBadgeStyle = {
    bgColor: mission.difficulty === 'easy'
      ? COLORS.success
      : mission.difficulty === 'deadly'
        ? COLORS.warning
        : COLORS.secondary,
    textColor: COLORS.white,
  }
  const missionBadges = [
    { text: `Difficulty: ${mission.difficulty}`, style: difficultyBadgeStyle },
  ]
  if (mission.recommendedLevel) {
    missionBadges.push({
      text: `Recommended: ${mission.recommendedLevel}`,
      style: { bgColor: COLORS.sectionBg, textColor: COLORS.textPrimary, borderColor: COLORS.border },
    })
  }
  renderBadgeGroup(layout.doc, layout.margin + 10, layout.y + 18, width - 20, missionBadges, 2)
  layout.y += detailCardHeight + 8

  renderSectionText(layout, 'Description', mission.description, { fontSize: 10, iconText: 'D', accentColor: COLORS.accent })
  renderSectionText(layout, 'Context', mission.context, { fontSize: 10, iconText: 'C', accentColor: COLORS.accent })

  if (mission.objectives && mission.objectives.length > 0) {
    startSection(layout, 'Objectives', 12, { iconText: 'O', accentColor: COLORS.secondary })
    mission.objectives.forEach((objective) => {
      const objectiveLines = [objective.description]
      if (objective.pathType) {
        objectiveLines.push(`Approach: ${objective.pathType}`)
      }
      const lines = buildWrappedLinesFromList(layout.doc, objectiveLines, textWidth, 9)
      const titlePrefix = objective.primary ? '★ Primary Objective' : '○ Optional Objective'
      renderTitledLinesBox(layout, {
        x: layout.margin,
        width,
        title: titlePrefix,
        lines,
        titleFontSize: 10,
        bodyFontSize: 9,
        titleColor: objective.primary ? COLORS.success : COLORS.textPrimary,
        borderColor: objective.primary ? COLORS.success : COLORS.border,
        onPageBreak: () => {
          layout.y = addSectionHeader(
            layout.doc,
            'Objectives (continued)',
            layout.y,
            layout.pageWidth,
            layout.margin,
            12,
            { iconText: 'O', accentColor: COLORS.secondary }
          )
        },
      })
    })
  }

  if (mission.rewards) {
    const rewardLines: string[] = []
    if (mission.rewards.xp) {
      rewardLines.push(`XP: ${mission.rewards.xp}`)
    }
    if (mission.rewards.gold) {
      rewardLines.push(`Gold: ${mission.rewards.gold}`)
    }
    if (mission.rewards.items && mission.rewards.items.length > 0) {
      rewardLines.push('Items:')
      mission.rewards.items.forEach((item) => rewardLines.push(`• ${item}`))
    }
    startSection(layout, 'Rewards', 12, { iconText: 'R', accentColor: COLORS.secondary })
    const lines = buildWrappedLinesFromList(
      layout.doc,
      rewardLines.length > 0 ? rewardLines : ['—'],
      textWidth,
      10
    )
    renderLinesBox(layout, lines, {
      x: layout.margin,
      width,
      fontSize: 10,
      onPageBreak: () => {
        layout.y = addSectionHeader(
          layout.doc,
          'Rewards (continued)',
          layout.y,
          layout.pageWidth,
          layout.margin,
          12,
          { iconText: 'R', accentColor: COLORS.secondary }
        )
      },
    })
  }

  if (mission.choiceBasedRewards && mission.choiceBasedRewards.length > 0) {
    startSection(layout, 'Choice-Based Rewards', 12, { iconText: 'B', accentColor: COLORS.secondary })
    mission.choiceBasedRewards.forEach((cbr) => {
      const lines: string[] = []
      if (cbr.rewards.xp) {
        lines.push(`XP: ${cbr.rewards.xp}`)
      }
      if (cbr.rewards.gold) {
        lines.push(`Gold: ${cbr.rewards.gold}`)
      }
      if (cbr.rewards.items && cbr.rewards.items.length > 0) {
        lines.push('Items:')
        cbr.rewards.items.forEach((item) => lines.push(`• ${item}`))
      }
      renderTitledLinesBox(layout, {
        x: layout.margin,
        width,
        title: `If ${cbr.condition}`,
        lines: buildWrappedLinesFromList(layout.doc, lines, textWidth, 9),
        titleFontSize: 10,
        bodyFontSize: 9,
        onPageBreak: () => {
          layout.y = addSectionHeader(
            layout.doc,
            'Choice-Based Rewards (continued)',
            layout.y,
            layout.pageWidth,
            layout.margin,
            12,
            { iconText: 'B', accentColor: COLORS.secondary }
          )
        },
      })
    })
  }

  if (mission.relatedNPCs && mission.relatedNPCs.length > 0) {
    renderSectionListTwoColumn(layout, 'Related NPCs', mission.relatedNPCs, { fontSize: 10, iconText: 'N', accentColor: COLORS.secondary })
  }

  if (mission.relatedLocations && mission.relatedLocations.length > 0) {
    renderSectionListTwoColumn(layout, 'Related Locations', mission.relatedLocations, { fontSize: 10, iconText: 'L', accentColor: COLORS.secondary })
  }

  if (mission.powerfulItems && mission.powerfulItems.length > 0) {
    startSection(layout, 'Powerful Items', 12, { iconText: 'P', accentColor: COLORS.secondary })
    mission.powerfulItems.forEach((item) => {
      const lines = buildWrappedLinesFromList(layout.doc, [`Status: ${item.status}`], textWidth, 9)
      renderTitledLinesBox(layout, {
        x: layout.margin,
        width,
        title: item.name,
        lines,
        titleFontSize: 10,
        bodyFontSize: 9,
        onPageBreak: () => {
          layout.y = addSectionHeader(
            layout.doc,
            'Powerful Items (continued)',
            layout.y,
            layout.pageWidth,
            layout.margin,
            12,
            { iconText: 'P', accentColor: COLORS.secondary }
          )
        },
      })
    })
  }

  if (mission.possibleOutcomes && mission.possibleOutcomes.length > 0) {
    renderSectionListTwoColumn(layout, 'Possible Outcomes', mission.possibleOutcomes, { fontSize: 10, iconText: 'O', accentColor: COLORS.secondary })
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
