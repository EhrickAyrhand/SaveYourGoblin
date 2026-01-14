/**
 * Export utilities for content items
 * Supports PDF and JSON export formats
 */

import jsPDF from 'jspdf'
import type { LibraryContentItem } from '@/components/rpg/library-card'
import type { Character, Environment, Mission } from '@/types/rpg'

// Color constants (RGB values)
const COLORS = {
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

/**
 * Helper function to draw a styled box/section with background and border
 */
function drawSectionBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: [number, number, number] = COLORS.sectionBg,
  borderColor: [number, number, number] = COLORS.border,
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

/**
 * Helper function to draw a horizontal separator line
 */
function drawSeparator(
  doc: jsPDF,
  y: number,
  pageWidth: number,
  margin: number,
  color: [number, number, number] = COLORS.border,
  width: number = 0.5
): void {
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(width)
  doc.line(margin, y, pageWidth - margin, y)
}

/**
 * Helper function to add styled text with optional background
 */
function addStyledText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: [number, number, number] = COLORS.textPrimary,
  isBold: boolean = false
): void {
  doc.setFontSize(fontSize)
  doc.setTextColor(color[0], color[1], color[2])
  if (isBold) {
    doc.setFont(undefined, 'bold')
  } else {
    doc.setFont(undefined, 'normal')
  }
  doc.text(text, x, y)
}

/**
 * Helper function to add header to each page
 */
function addHeader(
  doc: jsPDF,
  contentName: string,
  type: string,
  pageNumber: number,
  pageWidth: number,
  pageHeight: number
): void {
  const headerHeight = 15
  const headerY = 0
  
  // Draw header background
  doc.setFillColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setDrawColor(COLORS.primaryHeader[0], COLORS.primaryHeader[1], COLORS.primaryHeader[2])
  doc.setLineWidth(0)
  doc.rect(0, headerY, pageWidth, headerHeight, 'FD')
  
  // Add type indicator and page number
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
  doc.text(getTypeLabel(type), 15, headerY + 8)
  doc.text(`Page ${pageNumber}`, pageWidth - 15, headerY + 8, { align: 'right' })
}

/**
 * Helper function to add footer to each page
 */
function addFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number
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
  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  doc.text('SaveYourGoblin', 15, footerY + 8)
  doc.text(exportDate, pageWidth - 15, footerY + 8, { align: 'right' })
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
 * Helper function to add text with word wrap and page break handling
 */
function addTextWithWrap(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: [number, number, number] = COLORS.textPrimary,
  isBold: boolean = false,
  lineHeight: number = 1.3
): number {
  doc.setFontSize(fontSize)
  doc.setTextColor(color[0], color[1], color[2])
  if (isBold) {
    doc.setFont(undefined, 'bold')
  } else {
    doc.setFont(undefined, 'normal')
  }
  
  const lines = doc.splitTextToSize(text, maxWidth)
  let currentY = y
  
  lines.forEach((line: string, index: number) => {
    // Add small spacing for better readability
    if (index > 0) {
      currentY += 1
    }
    doc.text(line, x, currentY)
    currentY += fontSize * lineHeight
  })
  
  return currentY
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
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const headerHeight = 15
  const footerHeight = 12
  const contentStartY = margin + headerHeight + 5
  let yPosition = contentStartY
  let currentPage = 1
  const totalPages = 1 // Will be updated after content is added

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number): boolean => {
    if (yPosition + requiredSpace > pageHeight - footerHeight - margin) {
      // Add footer to current page
      addFooter(doc, currentPage, totalPages, pageWidth, pageHeight)
      
      // Add new page
      doc.addPage()
      currentPage++
      yPosition = contentStartY
      
      // Add header to new page
      addHeader(doc, getContentName(item), item.type, currentPage, pageWidth, pageHeight)
      
      return true
    }
    return false
  }

  // Add header to first page
  addHeader(doc, getContentName(item), item.type, currentPage, pageWidth, pageHeight)

  // Title section with background
  const contentName = getContentName(item)
  const titleHeight = 30
  checkPageBreak(titleHeight + 15)
  
  // Draw title background box with gradient effect (darker bottom)
  drawSectionBox(
    doc,
    margin,
    yPosition,
    pageWidth - 2 * margin,
    titleHeight,
    COLORS.secondary,
    COLORS.secondary,
    0
  )
  
  // Add subtle shadow line below title
  doc.setDrawColor(COLORS.secondary[0] * 0.7, COLORS.secondary[1] * 0.7, COLORS.secondary[2] * 0.7)
  doc.setLineWidth(1)
  doc.line(margin, yPosition + titleHeight, pageWidth - margin, yPosition + titleHeight)
  
  // Add title text with better positioning
  doc.setFontSize(22)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
  const titleWidth = doc.getTextWidth(contentName)
  doc.text(contentName, margin + (pageWidth - 2 * margin - titleWidth) / 2, yPosition + 20)
  
  yPosition += titleHeight + 10

  // Metadata box with improved styling
  const metadataText = `${getTypeLabel(item.type)} • Created: ${formatDate(item.created_at)}`
  checkPageBreak(18)
  const metadataBoxHeight = 14
  drawSectionBox(
    doc,
    margin,
    yPosition,
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
  doc.text(metadataText, margin + (pageWidth - 2 * margin - metaWidth) / 2, yPosition + 10)
  yPosition += metadataBoxHeight + 10

  // Tags (if present) - styled as badges
  if (item.tags && item.tags.length > 0) {
    checkPageBreak(20)
    addStyledText(doc, 'Tags', margin, yPosition, 12, COLORS.textPrimary, true)
    yPosition += 10
    
    let tagX = margin
    const tagHeight = 10
    const tagSpacing = 4
    const tagPadding = 6
    
    item.tags.forEach((tag) => {
      doc.setFontSize(8)
      const tagWidth = doc.getTextWidth(tag) + tagPadding * 2
      
      // Check if tag fits on current line
      if (tagX + tagWidth > pageWidth - margin) {
        tagX = margin
        yPosition += tagHeight + tagSpacing
        checkPageBreak(tagHeight + tagSpacing)
      }
      
      // Draw tag badge with rounded appearance
      drawSectionBox(doc, tagX, yPosition, tagWidth, tagHeight, COLORS.secondary, COLORS.secondary, 0)
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
      doc.text(tag, tagX + tagPadding, yPosition + 7)
      
      tagX += tagWidth + tagSpacing
    })
    
    yPosition += tagHeight + 10
  }

  // Original Scenario section
  checkPageBreak(25)
  yPosition = addSectionHeader(doc, 'Original Scenario', yPosition, pageWidth, margin, 12)
  checkPageBreak(20)
  const scenarioLines = doc.splitTextToSize(item.scenario_input, pageWidth - 2 * margin - 10)
  const scenarioBoxHeight = Math.min(Math.max(scenarioLines.length * 5 + 15, 35), 60)
  drawSectionBox(doc, margin, yPosition, pageWidth - 2 * margin, scenarioBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  yPosition = addTextWithWrap(doc, item.scenario_input, margin + 8, yPosition + 10, pageWidth - 2 * margin - 16, 10, COLORS.textPrimary, false, 1.3)
  yPosition += 8

  // Notes section (if present)
  if (item.notes && item.notes.trim().length > 0) {
    checkPageBreak(25)
    yPosition = addSectionHeader(doc, 'Notes', yPosition, pageWidth, margin, 12)
    checkPageBreak(20)
    const notesLines = doc.splitTextToSize(item.notes, pageWidth - 2 * margin - 10)
    const notesBoxHeight = Math.min(Math.max(notesLines.length * 5 + 15, 35), 60)
    drawSectionBox(doc, margin, yPosition, pageWidth - 2 * margin, notesBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    yPosition = addTextWithWrap(doc, item.notes, margin + 8, yPosition + 10, pageWidth - 2 * margin - 16, 10, COLORS.textPrimary, false, 1.3)
    yPosition += 8
  }

  // Content based on type
  yPosition += 5
  if (item.type === 'character') {
    yPosition = exportCharacterToPDF(doc, item.content_data as Character, yPosition, pageWidth, pageHeight, margin, headerHeight, footerHeight, checkPageBreak)
  } else if (item.type === 'environment') {
    yPosition = exportEnvironmentToPDF(doc, item.content_data as Environment, yPosition, pageWidth, pageHeight, margin, headerHeight, footerHeight, checkPageBreak)
  } else if (item.type === 'mission') {
    yPosition = exportMissionToPDF(doc, item.content_data as Mission, yPosition, pageWidth, pageHeight, margin, headerHeight, footerHeight, checkPageBreak)
  }

  // Add footer to last page
  addFooter(doc, currentPage, currentPage, pageWidth, pageHeight)

  // Save PDF
  doc.save(`${contentName}.pdf`)
}

function exportCharacterToPDF(
  doc: jsPDF,
  character: Character,
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  headerHeight: number,
  footerHeight: number,
  checkPageBreak: (requiredSpace: number) => boolean
): number {
  let y = startY

  // Character Details Section
  checkPageBreak(35)
  y = addSectionHeader(doc, 'Character Details', y, pageWidth, margin, 14)
  
  checkPageBreak(45)
  const detailsBoxHeight = 40
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, detailsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  
  let detailsY = y + 10
  addStyledText(doc, `Name: ${character.name}`, margin + 8, detailsY, 12, COLORS.textPrimary, true)
  detailsY += 8
  addStyledText(doc, `Race: ${character.race}`, margin + 8, detailsY, 10, COLORS.textPrimary, false)
  detailsY += 7
  addStyledText(doc, `Class: ${character.class}`, margin + 8, detailsY, 10, COLORS.textPrimary, false)
  detailsY += 7
  addStyledText(doc, `Level: ${character.level}`, margin + 8, detailsY, 10, COLORS.textPrimary, false)
  detailsY += 7
  addStyledText(doc, `Background: ${character.background}`, margin + 8, detailsY, 10, COLORS.textPrimary, false)
  
  y += detailsBoxHeight + 10

  // Ability Scores Section with Grid
  checkPageBreak(40)
  y = addSectionHeader(doc, 'Ability Scores', y, pageWidth, margin, 14)
  y = drawAbilityScoreGrid(doc, character, y, pageWidth, margin)
  y += 5

  // History Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'History', y, pageWidth, margin, 12)
  checkPageBreak(30)
  const historyLines = doc.splitTextToSize(character.history, pageWidth - 2 * margin - 16)
  const historyBoxHeight = Math.min(Math.max(historyLines.length * 6 + 20, 40), 70)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, historyBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, character.history, margin + 8, y + 12, pageWidth - 2 * margin - 16, 10, COLORS.textPrimary, false, 1.3)
  y += 8

  // Personality Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Personality', y, pageWidth, margin, 12)
  checkPageBreak(30)
  const personalityLines = doc.splitTextToSize(character.personality, pageWidth - 2 * margin - 16)
  const personalityBoxHeight = Math.min(Math.max(personalityLines.length * 6 + 20, 40), 70)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, personalityBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, character.personality, margin + 8, y + 12, pageWidth - 2 * margin - 16, 10, COLORS.textPrimary, false, 1.3)
  y += 8

  // Voice Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Voice', y, pageWidth, margin, 12)
  checkPageBreak(30)
  const voiceLines = doc.splitTextToSize(character.voiceDescription, pageWidth - 2 * margin - 16)
  const voiceBoxHeight = Math.min(Math.max(voiceLines.length * 6 + 20, 35), 60)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, voiceBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, character.voiceDescription, margin + 8, y + 12, pageWidth - 2 * margin - 16, 10, COLORS.textPrimary, false, 1.3)
  y += 8

  // Racial Traits Section
  if (character.racialTraits && character.racialTraits.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Racial Traits', y, pageWidth, margin, 12)
    checkPageBreak(25)
    const traitsBoxHeight = Math.min(character.racialTraits.length * 9 + 15, 60)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, traitsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    let traitsY = y + 10
    character.racialTraits.forEach(trait => {
      addStyledText(doc, `• ${trait}`, margin + 8, traitsY, 10, COLORS.textPrimary, false)
      traitsY += 8
    })
    y += traitsBoxHeight + 8
  }

  // Class Features Section
  if (character.classFeatures && character.classFeatures.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Class Features', y, pageWidth, margin, 12)
    
    character.classFeatures.forEach(feature => {
      checkPageBreak(35)
      const featureLines = doc.splitTextToSize(feature.description, pageWidth - 2 * margin - 16)
      const featureBoxHeight = Math.min(Math.max(featureLines.length * 5 + 25, 35), 60)
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, featureBoxHeight, COLORS.sectionBg, COLORS.border, 1)
      
      addStyledText(doc, `${feature.name} (Level ${feature.level})`, margin + 8, y + 10, 10, COLORS.textPrimary, true)
      y = addTextWithWrap(doc, feature.description, margin + 8, y + 18, pageWidth - 2 * margin - 16, 9, COLORS.textPrimary, false, 1.3)
      y += 8
    })
  }

  // Skills Section
  if (character.skills && character.skills.length > 0) {
    const proficientSkills = character.skills.filter(s => s.proficiency)
    if (proficientSkills.length > 0) {
      checkPageBreak(30)
      y = addSectionHeader(doc, 'Skills', y, pageWidth, margin, 12)
      checkPageBreak(25)
      const skillsLines = proficientSkills.map(s => `${s.name} (+${s.modifier})`)
      const skillsBoxHeight = Math.min(Math.max(skillsLines.length * 8 + 15, 30), 50)
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, skillsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
      let skillsY = y + 10
      skillsLines.forEach(skill => {
        addStyledText(doc, `• ${skill}`, margin + 8, skillsY, 10, COLORS.textPrimary, false)
        skillsY += 8
      })
      y += skillsBoxHeight + 8
    }
  }

  // Spells Section
  if (character.spells && character.spells.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Spells', y, pageWidth, margin, 12)
    
    character.spells.forEach(spell => {
      checkPageBreak(35)
      const spellLines = doc.splitTextToSize(spell.description, pageWidth - 2 * margin - 16)
      const spellBoxHeight = Math.min(Math.max(spellLines.length * 5 + 25, 35), 60)
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, spellBoxHeight, COLORS.sectionBg, COLORS.border, 1)
      
      addStyledText(doc, `${spell.name} (Level ${spell.level})`, margin + 8, y + 10, 10, COLORS.textPrimary, true)
      y = addTextWithWrap(doc, spell.description, margin + 8, y + 18, pageWidth - 2 * margin - 16, 9, COLORS.textPrimary, false, 1.3)
      y += 8
    })
  }

  return y
}

function exportEnvironmentToPDF(
  doc: jsPDF,
  environment: Environment,
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  headerHeight: number,
  footerHeight: number,
  checkPageBreak: (requiredSpace: number) => boolean
): number {
  let y = startY

  // Environment Details Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Environment Details', y, pageWidth, margin, 14)
  
  checkPageBreak(25)
  const detailsBoxHeight = 20
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, detailsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  addStyledText(doc, `Name: ${environment.name}`, margin + 5, y + 13, 11, COLORS.textPrimary, true)
  y += detailsBoxHeight + 8

  // Description Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Description', y, pageWidth, margin, 12)
  checkPageBreak(25)
  const descBoxHeight = Math.min(50, environment.description.length > 150 ? 70 : 40)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, descBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, environment.description, margin + 5, y + 8, pageWidth - 2 * margin - 10, 10, COLORS.textPrimary, false, 1.2)
  y += 5

  // Mood Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Mood', y, pageWidth, margin, 12)
  checkPageBreak(20)
  const moodBoxHeight = Math.min(25, environment.mood.length > 100 ? 35 : 20)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, moodBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, environment.mood, margin + 5, y + 8, pageWidth - 2 * margin - 10, 10, COLORS.textPrimary, false, 1.2)
  y += 5

  // Lighting Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Lighting', y, pageWidth, margin, 12)
  checkPageBreak(20)
  const lightingBoxHeight = Math.min(25, environment.lighting.length > 100 ? 35 : 20)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, lightingBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, environment.lighting, margin + 5, y + 8, pageWidth - 2 * margin - 10, 10, COLORS.textPrimary, false, 1.2)
  y += 5

  // Ambient Atmosphere Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Ambient Atmosphere', y, pageWidth, margin, 12)
  checkPageBreak(25)
  const ambientBoxHeight = Math.min(30, environment.ambient.length > 100 ? 40 : 25)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, ambientBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, environment.ambient, margin + 5, y + 8, pageWidth - 2 * margin - 10, 10, COLORS.textPrimary, false, 1.2)
  y += 5

  // Notable Features Section
  if (environment.features && environment.features.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Notable Features', y, pageWidth, margin, 12)
    checkPageBreak(20)
    const featuresBoxHeight = Math.min(environment.features.length * 8 + 10, 60)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, featuresBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    let featuresY = y + 8
    environment.features.forEach(feature => {
      addStyledText(doc, `• ${feature}`, margin + 5, featuresY, 10, COLORS.textPrimary, false)
      featuresY += 7
    })
    y += featuresBoxHeight + 5
  }

  // Present NPCs Section
  if (environment.npcs && environment.npcs.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Present NPCs', y, pageWidth, margin, 12)
    checkPageBreak(20)
    const npcsBoxHeight = Math.min(environment.npcs.length * 8 + 10, 60)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, npcsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    let npcsY = y + 8
    environment.npcs.forEach(npc => {
      addStyledText(doc, `• ${npc}`, margin + 5, npcsY, 10, COLORS.textPrimary, false)
      npcsY += 7
    })
    y += npcsBoxHeight + 5
  }

  // Current Conflict Section
  if (environment.currentConflict) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Current Conflict', y, pageWidth, margin, 12)
    checkPageBreak(25)
    const conflictBoxHeight = Math.min(40, environment.currentConflict.length > 150 ? 60 : 30)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, conflictBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    y = addTextWithWrap(doc, environment.currentConflict, margin + 5, y + 8, pageWidth - 2 * margin - 10, 10, COLORS.textPrimary, false, 1.2)
    y += 5
  }

  // Adventure Hooks Section
  if (environment.adventureHooks && environment.adventureHooks.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Adventure Hooks', y, pageWidth, margin, 12)
    checkPageBreak(20)
    const hooksBoxHeight = Math.min(environment.adventureHooks.length * 10 + 10, 70)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, hooksBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    let hooksY = y + 8
    environment.adventureHooks.forEach(hook => {
      addStyledText(doc, `• ${hook}`, margin + 5, hooksY, 10, COLORS.textPrimary, false)
      hooksY += 9
    })
    y += hooksBoxHeight + 5
  }
  
  return y
}

function exportMissionToPDF(
  doc: jsPDF,
  mission: Mission,
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  headerHeight: number,
  footerHeight: number,
  checkPageBreak: (requiredSpace: number) => boolean
): number {
  let y = startY

  // Mission Details Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Mission Details', y, pageWidth, margin, 14)
  
  checkPageBreak(35)
  const detailsBoxHeight = 30
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, detailsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  
  let detailsY = y + 8
  addStyledText(doc, `Title: ${mission.title}`, margin + 5, detailsY, 11, COLORS.textPrimary, true)
  detailsY += 7
  addStyledText(doc, `Difficulty: ${mission.difficulty}`, margin + 5, detailsY, 10, COLORS.textPrimary, false)
  if (mission.recommendedLevel) {
    detailsY += 6
    addStyledText(doc, `Recommended Level: ${mission.recommendedLevel}`, margin + 5, detailsY, 10, COLORS.textPrimary, false)
  }
  y += detailsBoxHeight + 8

  // Description Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Description', y, pageWidth, margin, 12)
  checkPageBreak(25)
  const descBoxHeight = Math.min(50, mission.description.length > 150 ? 70 : 40)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, descBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, mission.description, margin + 5, y + 8, pageWidth - 2 * margin - 10, 10, COLORS.textPrimary, false, 1.2)
  y += 5

  // Context Section
  checkPageBreak(30)
  y = addSectionHeader(doc, 'Context', y, pageWidth, margin, 12)
  checkPageBreak(25)
  const contextBoxHeight = Math.min(40, mission.context.length > 150 ? 60 : 30)
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, contextBoxHeight, COLORS.sectionBg, COLORS.border, 1)
  y = addTextWithWrap(doc, mission.context, margin + 5, y + 8, pageWidth - 2 * margin - 10, 10, COLORS.textPrimary, false, 1.2)
  y += 5

  // Objectives Section
  if (mission.objectives && mission.objectives.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Objectives', y, pageWidth, margin, 12)
    
    mission.objectives.forEach(obj => {
      checkPageBreak(25)
      const objBoxHeight = Math.min(30, obj.description.length > 100 ? 40 : 25)
      // Use different background color for primary objectives
      const objBgColor = obj.primary ? COLORS.success : COLORS.sectionBg
      const objBorderColor = obj.primary ? COLORS.success : COLORS.border
      
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, objBoxHeight, objBgColor, objBorderColor, 1)
      
      const prefix = obj.primary ? '★ Primary' : '○ Optional'
      const prefixColor = obj.primary ? COLORS.white : COLORS.textPrimary
      addStyledText(doc, prefix, margin + 5, y + 8, 9, prefixColor, true)
      
      y = addTextWithWrap(doc, obj.description, margin + 5, y + 15, pageWidth - 2 * margin - 10, 10, COLORS.textPrimary, false, 1.2)
      
      if (obj.pathType) {
        y += 3
        addStyledText(doc, `Approach: ${obj.pathType}`, margin + 5, y, 9, COLORS.textSecondary, false)
      }
      y += 5
    })
  }

  // Rewards Section
  if (mission.rewards) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Rewards', y, pageWidth, margin, 12)
    checkPageBreak(25)
    const rewardsBoxHeight = 30 + (mission.rewards.items && mission.rewards.items.length > 0 ? mission.rewards.items.length * 7 : 0)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, rewardsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    
    let rewardsY = y + 8
    if (mission.rewards.xp) {
      addStyledText(doc, `XP: ${mission.rewards.xp}`, margin + 5, rewardsY, 10, COLORS.success, true)
      rewardsY += 7
    }
    if (mission.rewards.gold) {
      addStyledText(doc, `Gold: ${mission.rewards.gold}`, margin + 5, rewardsY, 10, COLORS.secondary, true)
      rewardsY += 7
    }
    if (mission.rewards.items && mission.rewards.items.length > 0) {
      addStyledText(doc, 'Items:', margin + 5, rewardsY, 10, COLORS.textPrimary, true)
      rewardsY += 7
      mission.rewards.items.forEach(item => {
        addStyledText(doc, `  • ${item}`, margin + 5, rewardsY, 9, COLORS.textPrimary, false)
        rewardsY += 6
      })
    }
    y += rewardsBoxHeight + 5
  }

  // Choice-Based Rewards Section
  if (mission.choiceBasedRewards && mission.choiceBasedRewards.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Choice-Based Rewards', y, pageWidth, margin, 12)
    
    mission.choiceBasedRewards.forEach(cbr => {
      checkPageBreak(30)
      const cbrBoxHeight = 20 + (cbr.rewards.items.length > 0 ? cbr.rewards.items.length * 6 : 0) + (cbr.rewards.xp ? 6 : 0) + (cbr.rewards.gold ? 6 : 0)
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, cbrBoxHeight, COLORS.sectionBg, COLORS.border, 1)
      
      addStyledText(doc, `If ${cbr.condition}:`, margin + 5, y + 8, 10, COLORS.textPrimary, true)
      let cbrY = y + 15
      
      if (cbr.rewards.xp) {
        addStyledText(doc, `  XP: ${cbr.rewards.xp}`, margin + 5, cbrY, 9, COLORS.success, false)
        cbrY += 6
      }
      if (cbr.rewards.gold) {
        addStyledText(doc, `  Gold: ${cbr.rewards.gold}`, margin + 5, cbrY, 9, COLORS.secondary, false)
        cbrY += 6
      }
      if (cbr.rewards.items.length > 0) {
        cbr.rewards.items.forEach(item => {
          addStyledText(doc, `  • ${item}`, margin + 5, cbrY, 9, COLORS.textPrimary, false)
          cbrY += 6
        })
      }
      y += cbrBoxHeight + 5
    })
  }

  // Related NPCs Section
  if (mission.relatedNPCs && mission.relatedNPCs.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Related NPCs', y, pageWidth, margin, 12)
    checkPageBreak(20)
    const npcsBoxHeight = Math.min(mission.relatedNPCs.length * 8 + 10, 60)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, npcsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    let npcsY = y + 8
    mission.relatedNPCs.forEach(npc => {
      addStyledText(doc, `• ${npc}`, margin + 5, npcsY, 10, COLORS.textPrimary, false)
      npcsY += 7
    })
    y += npcsBoxHeight + 5
  }

  // Related Locations Section
  if (mission.relatedLocations && mission.relatedLocations.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Related Locations', y, pageWidth, margin, 12)
    checkPageBreak(20)
    const locsBoxHeight = Math.min(mission.relatedLocations.length * 8 + 10, 60)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, locsBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    let locsY = y + 8
    mission.relatedLocations.forEach(loc => {
      addStyledText(doc, `• ${loc}`, margin + 5, locsY, 10, COLORS.textPrimary, false)
      locsY += 7
    })
    y += locsBoxHeight + 5
  }

  // Powerful Items Section
  if (mission.powerfulItems && mission.powerfulItems.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Powerful Items', y, pageWidth, margin, 12)
    
    mission.powerfulItems.forEach(item => {
      checkPageBreak(25)
      const itemBoxHeight = 25
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, itemBoxHeight, COLORS.sectionBg, COLORS.border, 1)
      addStyledText(doc, item.name, margin + 5, y + 8, 10, COLORS.textPrimary, true)
      addStyledText(doc, `Status: ${item.status}`, margin + 5, y + 16, 9, COLORS.textSecondary, false)
      y += itemBoxHeight + 5
    })
  }

  // Possible Outcomes Section
  if (mission.possibleOutcomes && mission.possibleOutcomes.length > 0) {
    checkPageBreak(30)
    y = addSectionHeader(doc, 'Possible Outcomes', y, pageWidth, margin, 12)
    checkPageBreak(20)
    const outcomesBoxHeight = Math.min(mission.possibleOutcomes.length * 8 + 10, 70)
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, outcomesBoxHeight, COLORS.sectionBg, COLORS.border, 1)
    let outcomesY = y + 8
    mission.possibleOutcomes.forEach(outcome => {
      addStyledText(doc, `• ${outcome}`, margin + 5, outcomesY, 10, COLORS.textPrimary, false)
      outcomesY += 7
    })
    y += outcomesBoxHeight + 5
  }
  
  return y
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
