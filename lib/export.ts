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
  white: RGBColor
  black: RGBColor
} = {
  primaryHeader: [26, 54, 93],      // #1a365d - dark blue
  secondary: [217, 119, 6],          // #d97706 - amber/gold
  sectionBg: [254, 243, 199],        // #fef3c7 - light beige
  border: [203, 213, 225],           // #cbd5e1 - light gray
  textPrimary: [30, 41, 59],         // #1e293b - dark gray
  textSecondary: [100, 116, 139],    // #64748b - medium gray
  success: [5, 150, 105],            // #059669 - green
  warning: [220, 38, 38],            // #dc2626 - red
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

/**
 * Helper function to add a section header with background
 */
function addSectionHeader(
  doc: jsPDF,
  text: string,
  y: number,
  pageWidth: number,
  margin: number,
  fontSize: number = 14
): number {
  const headerHeight = fontSize + 8
  const headerY = y
  
  // Draw header background with subtle border
  doc.setFillColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setDrawColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setLineWidth(0)
  doc.rect(margin, headerY, pageWidth - 2 * margin, headerHeight, 'FD')
  
  // Add subtle shadow effect (darker line below)
  doc.setDrawColor(COLORS.primaryHeader[0] * 0.7, COLORS.primaryHeader[1] * 0.7, COLORS.primaryHeader[2] * 0.7)
  doc.setLineWidth(0.5)
  doc.line(margin, headerY + headerHeight, pageWidth - margin, headerY + headerHeight)
  
  // Add header text with better padding
  doc.setFontSize(fontSize)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
  doc.text(text, margin + 5, headerY + fontSize)
  
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

function startSection(layout: PdfLayoutContext, title: string, fontSize: number = 12): void {
  ensureSpace(layout, fontSize + 12)
  layout.y = addSectionHeader(layout.doc, title, layout.y, layout.pageWidth, layout.margin, fontSize)
}

function renderSectionText(
  layout: PdfLayoutContext,
  title: string,
  text: string,
  options?: { headerFontSize?: number; fontSize?: number; lineHeight?: number }
): void {
  const headerFontSize = options?.headerFontSize ?? 12
  const fontSize = options?.fontSize ?? 10
  const lineHeight = options?.lineHeight ?? 1.3
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, title, headerFontSize)

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
        headerFontSize
      )
    },
  })
}

function renderSectionList(
  layout: PdfLayoutContext,
  title: string,
  items: string[],
  options?: { headerFontSize?: number; fontSize?: number; lineHeight?: number }
): void {
  const headerFontSize = options?.headerFontSize ?? 12
  const fontSize = options?.fontSize ?? 10
  const lineHeight = options?.lineHeight ?? 1.3
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, title, headerFontSize)

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
        headerFontSize
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
  const boxHeight = 30
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
    // Draw box with better styling
    drawSectionBox(doc, x, y, boxWidth, boxHeight, COLORS.white, COLORS.border, 0.8)
    
    // Add ability name (centered)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    const nameWidth = doc.getTextWidth(ability.name)
    doc.text(ability.name, x + (boxWidth - nameWidth) / 2, y + 9)
    
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
    doc.text(modifierText, x + (boxWidth - modWidth) / 2, y + 27)
    
    x += boxWidth + spacing
  })
  
  return y + boxHeight + 8
}

/**
 * Export content as JSON file
 */
export function exportAsJSON(item: LibraryContentItem): void {
  const data = {
    id: item.id,
    type: item.type,
    scenario: item.scenario_input,
    content: item.content_data,
    tags: item.tags || [],
    notes: item.notes || '',
    created_at: item.created_at,
    is_favorite: item.is_favorite || false,
  }

  const jsonString = JSON.stringify(data, null, 2)
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

  const layout: PdfLayoutContext = {
    doc,
    pageWidth,
    pageHeight,
    margin,
    headerHeight,
    footerHeight,
    contentStartY,
    y: contentStartY,
    currentPage: 1,
  }

  // Title section with background
  const titleHeight = 30
  ensureSpace(layout, titleHeight + 10)

  drawSectionBox(
    doc,
    margin,
    layout.y,
    pageWidth - 2 * margin,
    titleHeight,
    COLORS.secondary,
    COLORS.secondary,
    0
  )

  doc.setDrawColor(COLORS.secondary[0] * 0.7, COLORS.secondary[1] * 0.7, COLORS.secondary[2] * 0.7)
  doc.setLineWidth(1)
  doc.line(margin, layout.y + titleHeight, pageWidth - margin, layout.y + titleHeight)

  doc.setFontSize(22)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
  const titleWidth = doc.getTextWidth(contentName)
  doc.text(contentName, margin + (pageWidth - 2 * margin - titleWidth) / 2, layout.y + 20)

  layout.y += titleHeight + 10

  // Metadata box
  const metadataText = `${getTypeLabel(item.type)} • Created: ${formatDate(item.created_at)}`
  const metadataBoxHeight = 14
  ensureSpace(layout, metadataBoxHeight + 10)
  drawSectionBox(
    doc,
    margin,
    layout.y,
    pageWidth - 2 * margin,
    metadataBoxHeight,
    COLORS.sectionBg,
    COLORS.border,
    1
  )
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  const metaWidth = doc.getTextWidth(metadataText)
  doc.text(metadataText, margin + (pageWidth - 2 * margin - metaWidth) / 2, layout.y + 10)
  layout.y += metadataBoxHeight + 10

  if (item.tags && item.tags.length > 0) {
    renderSectionList(layout, 'Tags', item.tags, { fontSize: 9 })
  }

  renderSectionText(layout, 'Original Scenario', item.scenario_input, { fontSize: 10 })

  if (item.notes && item.notes.trim().length > 0) {
    renderSectionText(layout, 'Notes', item.notes, { fontSize: 10 })
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
    addHeader(doc, contentName, item.type, page, totalPages, pageWidth, margin)
    addFooter(doc, page, totalPages, pageWidth, pageHeight, margin, item.created_at, item.tags, item.notes)
  }

  doc.save(`${contentName}.pdf`)
}

function exportCharacterToPDF(layout: PdfLayoutContext, character: Character): void {
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, 'Character Details', 14)
  const detailLines = [
    `Race: ${character.race}`,
    `Class: ${character.class}`,
    `Level: ${character.level}`,
    `Background: ${character.background}`,
  ]
  if (character.associatedMission) {
    detailLines.push(`Associated Mission: ${character.associatedMission}`)
  }

  renderTitledLinesBox(layout, {
    x: layout.margin,
    width,
    title: `Name: ${character.name}`,
    lines: buildWrappedLinesFromList(layout.doc, detailLines, textWidth, 10),
    titleFontSize: 11,
    bodyFontSize: 10,
    onPageBreak: () => {
      layout.y = addSectionHeader(
        layout.doc,
        'Character Details (continued)',
        layout.y,
        layout.pageWidth,
        layout.margin,
        14
      )
    },
  })

  startSection(layout, 'Ability Scores', 14)
  const abilityPageBreak = ensureSpace(layout, 40)
  if (abilityPageBreak) {
    layout.y = addSectionHeader(
      layout.doc,
      'Ability Scores (continued)',
      layout.y,
      layout.pageWidth,
      layout.margin,
      14
    )
  }
  layout.y = drawAbilityScoreGrid(layout.doc, character, layout.y, layout.pageWidth, layout.margin)
  layout.y += 5

  renderSectionText(layout, 'History', character.history, { fontSize: 10 })
  renderSectionText(layout, 'Personality', character.personality, { fontSize: 10 })
  renderSectionText(layout, 'Voice', character.voiceDescription, { fontSize: 10 })

  if (character.traits && character.traits.length > 0) {
    renderSectionList(layout, 'Traits', character.traits, { fontSize: 10 })
  }

  if (character.racialTraits && character.racialTraits.length > 0) {
    renderSectionList(layout, 'Racial Traits', character.racialTraits, { fontSize: 10 })
  }

  if (character.expertise && character.expertise.length > 0) {
    renderSectionList(layout, 'Expertise', character.expertise, { fontSize: 10 })
  }

  const equipment = (character as Character & { equipment?: string[] }).equipment
  if (equipment && equipment.length > 0) {
    renderSectionList(layout, 'Equipment', equipment, { fontSize: 10 })
  }

  if (character.classFeatures && character.classFeatures.length > 0) {
    startSection(layout, 'Class Features', 12)
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
            12
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
    renderSectionList(layout, 'Skills', skillLines, { fontSize: 10 })
  }

  if (character.spells && character.spells.length > 0) {
    startSection(layout, 'Spells', 12)
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
            12
          )
        },
      })
    })
  }
}

function exportEnvironmentToPDF(layout: PdfLayoutContext, environment: Environment): void {
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, 'Environment Details', 14)
  const detailLines = buildWrappedLinesFromList(
    layout.doc,
    [`Name: ${environment.name}`],
    textWidth,
    10
  )
  renderLinesBox(layout, detailLines, {
    x: layout.margin,
    width,
    fontSize: 10,
    onPageBreak: () => {
      layout.y = addSectionHeader(
        layout.doc,
        'Environment Details (continued)',
        layout.y,
        layout.pageWidth,
        layout.margin,
        14
      )
    },
  })

  renderSectionText(layout, 'Description', environment.description, { fontSize: 10 })
  renderSectionText(layout, 'Mood', environment.mood, { fontSize: 10 })
  renderSectionText(layout, 'Lighting', environment.lighting, { fontSize: 10 })
  renderSectionText(layout, 'Ambient Atmosphere', environment.ambient, { fontSize: 10 })

  if (environment.features && environment.features.length > 0) {
    renderSectionList(layout, 'Notable Features', environment.features, { fontSize: 10 })
  }

  if (environment.npcs && environment.npcs.length > 0) {
    renderSectionList(layout, 'Present NPCs', environment.npcs, { fontSize: 10 })
  }

  if (environment.currentConflict) {
    renderSectionText(layout, 'Current Conflict', environment.currentConflict, { fontSize: 10 })
  }

  if (environment.adventureHooks && environment.adventureHooks.length > 0) {
    renderSectionList(layout, 'Adventure Hooks', environment.adventureHooks, { fontSize: 10 })
  }
}

function exportMissionToPDF(layout: PdfLayoutContext, mission: Mission): void {
  const width = layout.pageWidth - 2 * layout.margin
  const textWidth = width - 16

  startSection(layout, 'Mission Details', 14)
  const detailLines = [
    `Difficulty: ${mission.difficulty}`,
  ]
  if (mission.recommendedLevel) {
    detailLines.push(`Recommended Level: ${mission.recommendedLevel}`)
  }
  renderTitledLinesBox(layout, {
    x: layout.margin,
    width,
    title: `Title: ${mission.title}`,
    lines: buildWrappedLinesFromList(layout.doc, detailLines, textWidth, 10),
    titleFontSize: 11,
    bodyFontSize: 10,
    onPageBreak: () => {
      layout.y = addSectionHeader(
        layout.doc,
        'Mission Details (continued)',
        layout.y,
        layout.pageWidth,
        layout.margin,
        14
      )
    },
  })

  renderSectionText(layout, 'Description', mission.description, { fontSize: 10 })
  renderSectionText(layout, 'Context', mission.context, { fontSize: 10 })

  if (mission.objectives && mission.objectives.length > 0) {
    startSection(layout, 'Objectives', 12)
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
            12
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
    startSection(layout, 'Rewards', 12)
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
          12
        )
      },
    })
  }

  if (mission.choiceBasedRewards && mission.choiceBasedRewards.length > 0) {
    startSection(layout, 'Choice-Based Rewards', 12)
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
            12
          )
        },
      })
    })
  }

  if (mission.relatedNPCs && mission.relatedNPCs.length > 0) {
    renderSectionList(layout, 'Related NPCs', mission.relatedNPCs, { fontSize: 10 })
  }

  if (mission.relatedLocations && mission.relatedLocations.length > 0) {
    renderSectionList(layout, 'Related Locations', mission.relatedLocations, { fontSize: 10 })
  }

  if (mission.powerfulItems && mission.powerfulItems.length > 0) {
    startSection(layout, 'Powerful Items', 12)
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
            12
          )
        },
      })
    })
  }

  if (mission.possibleOutcomes && mission.possibleOutcomes.length > 0) {
    renderSectionList(layout, 'Possible Outcomes', mission.possibleOutcomes, { fontSize: 10 })
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
