import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const moduleUrl = pathToFileURL(path.resolve('src/lib/oa-forms.ts')).href
const forms = await import(moduleUrl)

test('normalizeFormSlug creates stable url slugs', () => {
  assert.equal(forms.normalizeFormSlug('  Scholarship 2026!  '), 'scholarship-2026')
  assert.equal(forms.normalizeFormSlug('学术交流 报销'), 'xue-shu-jiao-liu-bao-xiao')
  assert.equal(forms.normalizeFormSlug('---'), 'form')
})

test('createDefaultOAFormDraft builds a publishable minimal schema', () => {
  const draft = forms.createDefaultOAFormDraft('奖学金申请')
  assert.equal(draft.title, '奖学金申请')
  assert.equal(draft.slug, 'jiang-xue-jin-shen-qing')
  assert.equal(draft.status, 'draft')
  assert.ok(Array.isArray(draft.fields))
  assert.ok(draft.fields.length >= 3)
  assert.ok(draft.fields.some((field) => field.type === 'file'))
})


test('form kind helpers separate generic forms and reimbursement forms', () => {
  const generic = forms.createDefaultOAFormDraft('普通问卷')
  const reimbursement = forms.createDefaultReimbursementFormDraft('学生活动报销')

  assert.equal(forms.getOAFormKind(generic), 'form')
  assert.equal(forms.getOAFormKind(reimbursement), 'reimbursement')
  assert.ok(reimbursement.fields.some((field) => field.type === 'table' && field.id === 'expense_items'))
  assert.ok(reimbursement.fields.some((field) => field.type === 'file' && field.id === 'receipts'))
  assert.ok(reimbursement.fields.some((field) => field.id === 'invoice_title'))
})

test('toOAFormUpsertPayload strips backend-only document fields before saving', () => {
  const docLikeDraft = {
    _id: 'q57343v3srgjngdm1xjsx4d5cd89kk83',
    _creationTime: 1782740120491.431,
    id: 'q57343v3srgjngdm1xjsx4d5cd89kk83',
    title: 'Test Form',
    slug: 'oa-form-mqz9fshw',
    description: 'ceshi',
    category: 'test',
    kind: 'form',
    status: 'draft',
    visibility: 'members',
    allowMultipleSubmissions: true,
    fields: [{ id: 'applicant_name', label: '姓名', required: true, type: 'text' }],
    resultFields: [],
    resultsVisible: false,
    createdAt: 1782740120491,
    createdBy: 'k570tc89ec3ef0sqq5ah1ahqqx89kvtn',
    updatedAt: 1782740120491,
    updatedBy: 'k570tc89ec3ef0sqq5ah1ahqqx89kvtn',
    sessionToken: 'client-wrapper-will-inject-this',
  }

  assert.deepEqual(forms.toOAFormUpsertPayload(docLikeDraft), {
    id: 'q57343v3srgjngdm1xjsx4d5cd89kk83',
    title: 'Test Form',
    slug: 'oa-form-mqz9fshw',
    description: 'ceshi',
    category: 'test',
    kind: 'form',
    status: 'draft',
    visibility: 'members',
    allowMultipleSubmissions: true,
    fields: [{ id: 'applicant_name', label: '姓名', required: true, type: 'text' }],
    resultFields: [],
    resultsVisible: false,
  })
})

test('toOAFormUpsertPayload preserves publication controls without forcing empty category to oa', () => {
  const payload = forms.toOAFormUpsertPayload({
    title: '奖学金申请',
    slug: 'scholarship',
    description: '',
    category: '',
    kind: 'form',
    status: 'draft',
    visibility: 'members',
    maxSubmissionsPerUser: 2,
    allowSubmissionEdits: true,
    allowMultipleSubmissions: true,
    fields: [{ id: 'name', label: '姓名', required: true, type: 'text' }],
    resultFields: [],
  })

  assert.equal(payload.category, '')
  assert.equal(payload.maxSubmissionsPerUser, 2)
  assert.equal(payload.allowSubmissionEdits, true)
})

test('validateOAFormDraftForSave blocks empty category before saving', () => {
  const draft = {
    title: '奖学金申请',
    slug: 'scholarship',
    category: '  ',
    fields: [{ id: 'name', label: '姓名', required: true, type: 'text' }],
  }

  assert.deepEqual(forms.validateOAFormDraftForSave(draft), ['请填写分类'])
  assert.deepEqual(forms.validateOAFormDraftForSave({ ...draft, category: 'scholarship' }), [])
})

test('splitOAFormsByCollectionStatus separates collecting and past forms', () => {
  const now = 2000
  const formsList = [
    { _id: 'active', title: '正在收集', status: 'published', closeAt: 3000 },
    { _id: 'expired', title: '已截止', status: 'published', closeAt: 1000 },
    { _id: 'archived', title: '已归档', status: 'archived' },
    { _id: 'draft', title: '草稿', status: 'draft' },
  ]

  assert.deepEqual(forms.splitOAFormsByCollectionStatus(formsList, now), {
    collecting: [formsList[0]],
    past: [formsList[1], formsList[2]],
  })
})

test('validateOAFormAnswers catches required missing fields and accepts valid answers', () => {
  const form = {
    fields: [
      { id: 'name', type: 'text', label: '姓名', required: true },
      { id: 'reason', type: 'textarea', label: '申请理由', required: true },
      { id: 'amount', type: 'number', label: '金额', required: false },
    ],
  }

  assert.deepEqual(forms.validateOAFormAnswers(form, { name: '张三' }), ['请填写申请理由'])
  assert.deepEqual(forms.validateOAFormAnswers(form, { name: '张三', reason: '科研差旅', amount: 100 }), [])
  assert.deepEqual(forms.validateOAFormAnswers(form, { name: '张三', reason: '科研差旅', amount: 'abc' }), ['金额必须是数字'])
})

test('validateOAFormAnswers validates repeating table rows', () => {
  const form = {
    fields: [
      {
        id: 'expenses',
        type: 'table',
        label: '报销明细',
        required: true,
        columns: [
          { id: 'item', label: '项目', type: 'text', required: true },
          { id: 'amount', label: '金额', type: 'number', required: true },
        ],
      },
    ],
  }

  assert.deepEqual(forms.validateOAFormAnswers(form, { expenses: [] }), ['请至少填写一行报销明细'])
  assert.deepEqual(forms.validateOAFormAnswers(form, { expenses: [{ item: '机票', amount: 'abc' }] }), ['报销明细第 1 行金额必须是数字'])
  assert.deepEqual(forms.validateOAFormAnswers(form, { expenses: [{ item: '机票', amount: 1200 }] }), [])
})

test('validateOAFileMetadata enforces count size and mime constraints', () => {
  const field = {
    id: 'receipt',
    type: 'file',
    label: '票据',
    required: true,
    maxFiles: 2,
    maxFileSizeMB: 5,
    acceptedMimeTypes: ['application/pdf', 'image/png'],
  }

  assert.deepEqual(forms.validateOAFileMetadata(field, []), ['请上传票据'])
  assert.deepEqual(forms.validateOAFileMetadata(field, [
    { storageId: 'a', fileName: 'a.pdf', mimeType: 'application/pdf', size: 1024 },
    { storageId: 'b', fileName: 'b.png', mimeType: 'image/png', size: 1024 },
    { storageId: 'c', fileName: 'c.png', mimeType: 'image/png', size: 1024 },
  ]), ['票据最多上传 2 个文件'])
  assert.deepEqual(forms.validateOAFileMetadata(field, [{ storageId: 'a', fileName: 'a.exe', mimeType: 'application/x-msdownload', size: 1024 }]), ['票据不支持该文件类型'])
  assert.deepEqual(forms.validateOAFileMetadata(field, [{ storageId: 'a', fileName: 'a.pdf', mimeType: 'application/pdf', size: 6 * 1024 * 1024 }]), ['票据单个文件不能超过 5MB'])
})


test('normalizeOAFormAnswers rejects unknown fields and strips unconfigured values', () => {
  const form = {
    fields: [
      { id: 'name', type: 'text', label: '姓名', required: true },
      { id: 'receipt', type: 'file', label: '票据', required: false, maxFiles: 1, maxFileSizeMB: 5, acceptedMimeTypes: ['application/pdf'] },
    ],
  }

  assert.throws(() => forms.normalizeOAFormAnswers(form, {
    name: '张三',
    receipt: [],
    injected: [{ storageId: 'stolen', fileName: 'x.pdf', mimeType: 'application/pdf', size: 1 }],
  }), /未知字段/)

  assert.deepEqual(forms.normalizeOAFormAnswers(form, { name: '张三', receipt: [] }), { name: '张三', receipt: [] })
})

test('collectOAFormAttachmentStorageIds only trusts declared file fields', () => {
  const form = {
    fields: [
      { id: 'name', type: 'text', label: '姓名', required: true },
      { id: 'receipt', type: 'file', label: '票据', required: false },
    ],
  }
  const ids = forms.collectOAFormAttachmentStorageIds(form, {
    name: '张三',
    receipt: [{ storageId: 'allowed', fileName: 'a.pdf', mimeType: 'application/pdf', size: 1 }],
    injected: [{ storageId: 'blocked', fileName: 'b.pdf', mimeType: 'application/pdf', size: 1 }],
  })

  assert.deepEqual([...ids], ['allowed'])
})


test('parseOAResultBatchText parses CSV/TSV result rows by student id or submission id', () => {
  const fields = [
    { id: 'decision', label: '是否通过', type: 'text', visibleToSubmitter: true },
    { id: 'amount', label: '金额', type: 'number', visibleToSubmitter: true },
  ]
  const rows = forms.parseOAResultBatchText('studentId,reviewStatus,decision,amount\n20260001,approved,通过,1200\n20260002,rejected,未通过,0', fields)
  assert.deepEqual(rows, [
    { studentId: '20260001', reviewStatus: 'approved', resultValues: { decision: '通过', amount: 1200 } },
    { studentId: '20260002', reviewStatus: 'rejected', resultValues: { decision: '未通过', amount: 0 } },
  ])

  const bySubmission = forms.parseOAResultBatchText('submissionId\tdecision\nabc123\t候补', fields)
  assert.deepEqual(bySubmission, [{ submissionId: 'abc123', resultValues: { decision: '候补' } }])
})

test('serializeOAFormSubmissionsToCsv escapes values and includes status labels', () => {
  const form = {
    fields: [
      { id: 'name', type: 'text', label: '姓名', required: true },
      { id: 'reason', type: 'textarea', label: '理由', required: false },
    ],
    resultFields: [{ id: 'decision', label: '结果', type: 'text', visibleToSubmitter: true }],
  }
  const csv = forms.serializeOAFormSubmissionsToCsv(form, [
    {
      submitterName: '张三',
      studentId: '20260001',
      reviewStatus: 'approved',
      answers: { name: '张三', reason: '含有,逗号和"引号"' },
      resultValues: { decision: '通过' },
      submittedAt: 1760000000000,
    },
  ])

  assert.match(csv, /^"提交人","学号","状态","提交时间","姓名","理由","结果"/)
  assert.match(csv, /已通过/)
  assert.match(csv, /"含有,逗号和""引号"""/)
})
