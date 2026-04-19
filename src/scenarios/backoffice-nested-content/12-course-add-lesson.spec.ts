/**
 * Nested-content 12 — Course: add a lesson (content block) inline.
 *
 * Parent route : /categorias/courses/edit/:id   (edit-course.jsx)
 * DB table     : course_contents                (@@map in Prisma schema)
 *
 * No seed course exists — spec creates one via the list modal first,
 * then navigates to its edit page and adds a lesson.
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbQuery, dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-nested-content'
const COURSE_NAME = `E2E Course ${Date.now()}`
const LESSON_NAME = `E2E Lesson ${Date.now()}`
const LESSON_URL = 'https://example.com/lesson-video.mp4'

test.describe.configure({ mode: 'serial' })

test.describe('12 — course add lesson', () => {
  let courseId: string

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: create seed course via list modal', async ({ page }) => {
    await page.goto('/categorias/courses')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    const nomeField = page.locator('#name').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(COURSE_NAME)

    const descEditor = page.locator('.ql-editor').first()
    await descEditor.scrollIntoViewIfNeeded()
    await descEditor.click()
    await page.keyboard.type('Curso criado automaticamente pelo E2E.')

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    await expect(page.locator(`text=${COURSE_NAME}`).first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-01-course-created.png`, fullPage: true })

    // Resolve courseId from DB
    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM courses WHERE name = '${COURSE_NAME}' ORDER BY id DESC LIMIT 1`,
    )
    if (rows.length === 0) throw new Error(`Course not found in DB after creation: ${COURSE_NAME}`)
    courseId = rows[0]['0']
  })

  test('step 2: navigate to course edit page', async ({ page }) => {
    await page.goto(`/categorias/courses/edit/${courseId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await expect(
      page.locator('h4:has-text("Novo Conteúdo"), #contentName').first(),
    ).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-02-course-edit.png`, fullPage: true })
  })

  test('step 3: fill and submit add-lesson form', async ({ page }) => {
    await page.goto(`/categorias/courses/edit/${courseId}`)
    await expect(page.locator('#contentName')).toBeVisible({ timeout: 15_000 })

    await page.locator('#contentName').scrollIntoViewIfNeeded()
    await page.locator('#contentName').fill(LESSON_NAME)

    await page.locator('#contentURL').scrollIntoViewIfNeeded()
    await page.locator('#contentURL').fill(LESSON_URL)

    // Descrição — rich-text, best-effort
    const descEditor = page.locator('#contentDescription .ql-editor, [aria-label*="contentDescription"] .ql-editor').first()
    if (await descEditor.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descEditor.click()
      await page.keyboard.type('Lição criada pelo E2E.')
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-03-lesson-filled.png`, fullPage: true })

    const saveBtn = page.getByRole('button', { name: /Salvar Conteúdo/i })
    await saveBtn.scrollIntoViewIfNeeded()
    await saveBtn.click()

    await expect(
      page.locator(`text=${LESSON_NAME}, [role="status"]:has-text("sucesso")`).first(),
    ).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-04-lesson-saved.png`, fullPage: true })
  })

  test('step 4: DB row exists in course_contents', async () => {
    const rows = await dbAssert<{ id: string; name: string }>(
      config.db.url,
      `SELECT id, name FROM course_contents WHERE name = '${LESSON_NAME}' ORDER BY id DESC LIMIT 1`,
      ['id', 'name'],
      (r) => r.name === LESSON_NAME,
    )
    console.log('[db-assert] course_contents row:', rows[0])
  })
})
