/**
 * @deprecated 此文件已弃用，请使用 @/lib/api 中的 Convex hooks 替代
 * 
 * 此文件保留用于向后兼容，最终将被移除。
 * 
 * 使用示例:
 *   - 使用 useNews(), useEvents(), usePublications(), useCourses() 等 hooks
 *   - 替代原来的 getNews(), getEvents() 等函数
 */

"use client"

import type { News, Event, Publication, Course, CourseReview } from "@/types"

// Storage keys
const NEWS_KEY = "tongclass.news.v1"
const EVENTS_KEY = "tongclass.events.v1"
const PUBLICATIONS_KEY = "tongclass.publications.v1"
const COURSES_KEY = "tongclass.courses.v1"

const now = () => Date.now()

// Seed data for local development
const seedNews: News[] = [
  {
    _id: "news-1",
    title: "通班学生获ICML 2024最佳论文奖",
    content: "恭喜通班学生XXX在ICML 2024获得最佳论文奖！这是在机器学习领域顶级会议上获得的殊荣...",
    authorId: "seed-admin",
    authorName: "王老师",
    category: "学术成果",
    publishedAt: new Date("2024-01-15").getTime(),
    isPublished: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "news-2",
    title: "2024年春季学期课程安排发布",
    content: "2024年春季学期课程安排已发布，请同学们查看具体课程时间和上课地点...",
    authorId: "seed-admin",
    authorName: "教务处",
    category: "课程安排",
    publishedAt: new Date("2024-01-10").getTime(),
    isPublished: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "news-3",
    title: "通班学术沙龙圆满结束",
    content: "上周五举办的通班学术沙龙活动圆满结束，本次沙龙邀请了多位优秀学长学姐分享科研经验...",
    authorId: "seed-admin",
    authorName: "学生组织",
    category: "活动回顾",
    publishedAt: new Date("2024-01-05").getTime(),
    isPublished: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "news-4",
    title: "关于举办2024年通班新生见面会的通知",
    content: "为帮助新生更好地了解通班项目，将于本周六举办新生见面会...",
    authorId: "seed-admin",
    authorName: "学生会",
    category: "活动预告",
    publishedAt: new Date("2024-01-01").getTime(),
    isPublished: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "news-5",
    title: "通班项目获批国家自然科学基金重点项目",
    content: "近日，通班项目获批国家自然科学基金重点项目，资助金额达...",
    authorId: "seed-admin",
    authorName: "通班办公室",
    category: "学术成果",
    publishedAt: new Date("2023-12-20").getTime(),
    isPublished: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "news-6",
    title: "寒假期间实验室安全须知",
    content: "为确保寒假期间实验室安全，请各位同学注意以下事项...",
    authorId: "seed-admin",
    authorName: "实验室管理",
    category: "通知公告",
    publishedAt: new Date("2023-12-15").getTime(),
    isPublished: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "news-7",
    title: "通班学生参加NeurIPS 2023并做口头报告",
    content: "通班学生XXX受邀参加NeurIPS 2023会议并做口头报告，分享了最新研究成果...",
    authorId: "seed-admin",
    authorName: "王老师",
    category: "学术成果",
    publishedAt: new Date("2023-12-10").getTime(),
    isPublished: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "news-8",
    title: "2024年寒假放假安排",
    content: "根据学校安排，2024年寒假自1月20日起至2月18日止...",
    authorId: "seed-admin",
    authorName: "教务处",
    category: "通知公告",
    publishedAt: new Date("2023-12-05").getTime(),
    isPublished: true,
    createdAt: now(),
    updatedAt: now(),
  },
]

const seedEvents: Event[] = [
  {
    _id: "event-1",
    title: "通班学术沙龙",
    date: "2024-02-15",
    time: "14:00-16:00",
    location: "北京大学光华楼",
    description: "邀请业界专家分享最新的AI研究成果",
    color: "#0F4C81",
    url: "",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "event-2",
    title: "春季学期开学典礼",
    date: "2024-02-20",
    time: "09:00-11:00",
    location: "清华大学主楼",
    description: "新学期开学典礼暨新生欢迎会",
    color: "#DC143C",
    url: "",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "event-3",
    title: "AI前沿技术讲座",
    date: "2024-03-05",
    time: "15:00-17:00",
    location: "线上",
    description: "邀请MIT教授进行线上讲座",
    color: "#2E7D32",
    url: "",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "event-4",
    title: "通班运动会",
    date: "2024-04-10",
    time: "08:00-18:00",
    location: "北京大学体育场",
    description: "一年一度的通班运动会",
    color: "#F57C00",
    url: "",
    createdAt: now(),
    updatedAt: now(),
  },
]

const seedPublications: Publication[] = [
  {
    _id: "pub-1",
    title: "Efficient Deep Learning for Image Classification",
    authors: ["Zhang Wei", "Li Ming", "Wang Lei"],
    venue: "CVPR 2024",
    year: 2024,
    abstract: "We present a novel efficient deep learning method for image classification that achieves state-of-the-art performance while significantly reducing computational costs.",
    url: "https://arxiv.org",
    category: "Computer Vision",
    subCategory: "image understanding",
    userId: "seed-super-admin",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "pub-2",
    title: "Robust Neural Networks against Adversarial Attacks",
    authors: ["Zhang Wei", "Chen Hao"],
    venue: "ICML 2024",
    year: 2024,
    abstract: "We investigate the capability of large language models in code generation tasks.",
    url: "https://arxiv.org",
    category: "Machine Learning",
    subCategory: "theory",
    userId: "seed-super-admin",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "pub-3",
    title: "Multimodal Learning for Vision-Language Tasks",
    authors: ["Li Ming", "Liu Yang", "Zhang Wei"],
    venue: "NeurIPS 2024",
    year: 2024,
    abstract: "We present a novel diffusion model architecture for high-quality text-to-image synthesis.",
    url: "https://arxiv.org",
    category: "Multimodal AI",
    subCategory: "vision-language",
    userId: "seed-super-admin",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "pub-4",
    title: "Scalable Distributed Training Systems",
    authors: ["Wang Lei", "Chen Hao", "Zhang Wei"],
    venue: "OSDI 2024",
    year: 2024,
    abstract: "We present innovative approaches to distributed training systems.",
    url: "https://arxiv.org",
    category: "AI Systems",
    subCategory: "distributed training",
    userId: "seed-super-admin",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "pub-5",
    title: "Reinforcement Learning for Robotics Control",
    authors: ["Liu Yang", "Zhang Wei"],
    venue: "ICRA 2024",
    year: 2024,
    abstract: "We present novel reinforcement learning approaches for robotics control.",
    url: "https://arxiv.org",
    category: "Robotics",
    subCategory: "control",
    userId: "seed-super-admin",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "pub-6",
    title: "Large Language Model Alignment",
    authors: ["Chen Hao", "Li Ming", "Wang Lei"],
    venue: "ICLR 2024",
    year: 2024,
    abstract: "We investigate alignment techniques for large language models.",
    url: "https://arxiv.org",
    category: "AI Safety",
    subCategory: "alignment",
    userId: "seed-super-admin",
    createdAt: now(),
    updatedAt: now(),
  },
]

const seedCourses: Course[] = [
  {
    _id: "course-1",
    name: "人工智能导论",
    isTongClassCourse: true,
    reviewCount: 2,
    averageRating: 8.5,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "course-2",
    name: "机器学习",
    isTongClassCourse: true,
    reviewCount: 1,
    averageRating: 10,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "course-3",
    name: "深度学习",
    isTongClassCourse: false,
    reviewCount: 2,
    averageRating: 8.5,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "course-4",
    name: "计算机视觉",
    isTongClassCourse: false,
    reviewCount: 1,
    averageRating: 9,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    _id: "course-5",
    name: "自然语言处理",
    isTongClassCourse: false,
    reviewCount: 1,
    averageRating: 8,
    createdAt: now(),
    updatedAt: now(),
  },
]

const seedCourseReviews: Record<string, CourseReview[]> = {
  "人工智能导论": [
    { _id: "review-1", courseName: "人工智能导论", instructor: "张教授", semesterYear: 2024, semesterTerm: "spring", overallRating: 9, department: "智能科学与技术系", content: "老师讲得很好，收获很大！", isAnonymous: true, status: "approved", createdAt: now(), updatedAt: now() },
    { _id: "review-2", courseName: "人工智能导论", instructor: "张教授", semesterYear: 2023, semesterTerm: "fall", overallRating: 8, department: "智能科学与技术系", content: "课程内容充实，推荐选课。", isAnonymous: true, status: "approved", createdAt: now(), updatedAt: now() },
  ],
  "机器学习": [
    { _id: "review-3", courseName: "机器学习", instructor: "李教授", semesterYear: 2024, semesterTerm: "spring", overallRating: 10, department: "计算机科学与技术系", content: "非常经典的ML课程，老师水平很高。", isAnonymous: true, status: "approved", createdAt: now(), updatedAt: now() },
  ],
  "深度学习": [
    { _id: "review-4", courseName: "深度学习", instructor: "王教授", semesterYear: 2024, semesterTerm: "spring", overallRating: 9, department: "人工智能研究院", content: "理论与实践结合紧密。", isAnonymous: true, status: "approved", createdAt: now(), updatedAt: now() },
    { _id: "review-5", courseName: "深度学习", instructor: "王教授", semesterYear: 2023, semesterTerm: "fall", overallRating: 8, department: "人工智能研究院", content: "作业有难度但很有收获。", isAnonymous: true, status: "approved", createdAt: now(), updatedAt: now() },
  ],
  "计算机视觉": [
    { _id: "review-6", courseName: "计算机视觉", instructor: "周教授", semesterYear: 2023, semesterTerm: "fall", overallRating: 9, department: "电子工程系", content: "CV领域入门好课。", isAnonymous: true, status: "approved", createdAt: now(), updatedAt: now() },
  ],
  "自然语言处理": [
    { _id: "review-7", courseName: "自然语言处理", instructor: "陈教授", semesterYear: 2024, semesterTerm: "spring", overallRating: 8, department: "信息工程系", content: "内容丰富，需要较多时间投入。", isAnonymous: true, status: "approved", createdAt: now(), updatedAt: now() },
  ],
}

const COURSE_REVIEWS_KEY = "tongclass.course-reviews.v1"

// Helper functions
function hasWindow() {
  return typeof window !== "undefined"
}

function readFromStorage<T>(key: string, seedData: T[]): T[] {
  if (!hasWindow()) return seedData

  const raw = localStorage.getItem(key)
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(seedData))
    return seedData
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      localStorage.setItem(key, JSON.stringify(seedData))
      return seedData
    }
    return parsed
  } catch {
    localStorage.setItem(key, JSON.stringify(seedData))
    return seedData
  }
}

function writeToStorage<T>(key: string, data: T[]) {
  if (!hasWindow()) return
  localStorage.setItem(key, JSON.stringify(data))
}

function readCourseReviews(): Record<string, CourseReview[]> {
  if (!hasWindow()) return seedCourseReviews

  const raw = localStorage.getItem(COURSE_REVIEWS_KEY)
  if (!raw) {
    localStorage.setItem(COURSE_REVIEWS_KEY, JSON.stringify(seedCourseReviews))
    return seedCourseReviews
  }

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) {
      localStorage.setItem(COURSE_REVIEWS_KEY, JSON.stringify(seedCourseReviews))
      return seedCourseReviews
    }
    return parsed
  } catch {
    localStorage.setItem(COURSE_REVIEWS_KEY, JSON.stringify(seedCourseReviews))
    return seedCourseReviews
  }
}

function writeCourseReviews(data: Record<string, CourseReview[]>) {
  if (!hasWindow()) return
  localStorage.setItem(COURSE_REVIEWS_KEY, JSON.stringify(data))
}

// News functions
export function getNews(): News[] {
  return readFromStorage(NEWS_KEY, seedNews)
}

export function getNewsById(id: string): News | undefined {
  const news = getNews()
  return news.find((n) => n._id === id)
}

export function addNews(news: Omit<News, "_id" | "createdAt" | "updatedAt">): News {
  const allNews = getNews()
  const newItem: News = {
    ...news,
    _id: `news-${now()}`,
    createdAt: now(),
    updatedAt: now(),
  }
  writeToStorage(NEWS_KEY, [newItem, ...allNews])
  return newItem
}

export function updateNews(id: string, updates: Partial<News>): News | undefined {
  const allNews = getNews()
  const index = allNews.findIndex((n) => n._id === id)
  if (index === -1) return undefined

  const updated: News = {
    ...allNews[index],
    ...updates,
    updatedAt: now(),
  }
  allNews[index] = updated
  writeToStorage(NEWS_KEY, allNews)
  return updated
}

export function deleteNews(id: string): boolean {
  const allNews = getNews()
  const filtered = allNews.filter((n) => n._id !== id)
  if (filtered.length === allNews.length) return false
  writeToStorage(NEWS_KEY, filtered)
  return true
}

// Events functions
export function getEvents(): Event[] {
  return readFromStorage(EVENTS_KEY, seedEvents)
}

export function getEventById(id: string): Event | undefined {
  const events = getEvents()
  return events.find((e) => e._id === id)
}

export function addEvent(event: Omit<Event, "_id" | "createdAt" | "updatedAt">): Event {
  const allEvents = getEvents()
  const newItem: Event = {
    ...event,
    _id: `event-${now()}`,
    createdAt: now(),
    updatedAt: now(),
  }
  writeToStorage(EVENTS_KEY, [newItem, ...allEvents])
  return newItem
}

export function updateEvent(id: string, updates: Partial<Event>): Event | undefined {
  const allEvents = getEvents()
  const index = allEvents.findIndex((e) => e._id === id)
  if (index === -1) return undefined

  const updated: Event = {
    ...allEvents[index],
    ...updates,
    updatedAt: now(),
  }
  allEvents[index] = updated
  writeToStorage(EVENTS_KEY, allEvents)
  return updated
}

export function deleteEvent(id: string): boolean {
  const allEvents = getEvents()
  const filtered = allEvents.filter((e) => e._id !== id)
  if (filtered.length === allEvents.length) return false
  writeToStorage(EVENTS_KEY, filtered)
  return true
}

// Publications functions
export function getPublications(): Publication[] {
  return readFromStorage(PUBLICATIONS_KEY, seedPublications)
}

export function getPublicationById(id: string): Publication | undefined {
  const pubs = getPublications()
  return pubs.find((p) => p._id === id)
}

export function addPublication(pub: Omit<Publication, "_id" | "createdAt" | "updatedAt">): Publication {
  const allPubs = getPublications()
  const newItem: Publication = {
    ...pub,
    _id: `pub-${now()}`,
    createdAt: now(),
    updatedAt: now(),
  }
  writeToStorage(PUBLICATIONS_KEY, [newItem, ...allPubs])
  return newItem
}

export function updatePublication(id: string, updates: Partial<Publication>): Publication | undefined {
  const allPubs = getPublications()
  const index = allPubs.findIndex((p) => p._id === id)
  if (index === -1) return undefined

  const updated: Publication = {
    ...allPubs[index],
    ...updates,
    updatedAt: now(),
  }
  allPubs[index] = updated
  writeToStorage(PUBLICATIONS_KEY, allPubs)
  return updated
}

export function deletePublication(id: string): boolean {
  const allPubs = getPublications()
  const filtered = allPubs.filter((p) => p._id !== id)
  if (filtered.length === allPubs.length) return false
  writeToStorage(PUBLICATIONS_KEY, filtered)
  return true
}

// Courses functions
export function getCourses(): Course[] {
  return readFromStorage(COURSES_KEY, seedCourses)
}

export function getCourseById(id: string): Course | undefined {
  const courses = getCourses()
  return courses.find((c) => c._id === id)
}

export function getCourseByName(name: string): Course | undefined {
  const courses = getCourses()
  return courses.find((c) => c.name === name)
}

// Course Reviews functions
export function getCourseReviews(courseName: string): CourseReview[] {
  const allReviews = readCourseReviews()
  return (allReviews[courseName] || []).filter((review) => review.status === "approved")
}

export function getAllCourseReviews(): Record<string, CourseReview[]> {
  const allReviews = readCourseReviews()
  return Object.fromEntries(
    Object.entries(allReviews).map(([courseName, reviews]) => [
      courseName,
      reviews.filter((review) => review.status === "approved"),
    ])
  )
}

export function getAllCourseReviewsForAdmin(): Record<string, CourseReview[]> {
  return readCourseReviews()
}

function updateCourseAggregates(courseName: string, allReviews: Record<string, CourseReview[]>) {
  const courses = getCourses()
  const courseIndex = courses.findIndex((course) => course.name === courseName)
  if (courseIndex === -1) return

  const approvedReviews = (allReviews[courseName] || []).filter((review) => review.status === "approved")
  const avgRating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, review) => sum + review.overallRating, 0) / approvedReviews.length
      : 0

  courses[courseIndex] = {
    ...courses[courseIndex],
    reviewCount: approvedReviews.length,
    averageRating: avgRating,
    updatedAt: now(),
  }
  writeToStorage(COURSES_KEY, courses)
}

export function addCourseReview(
  courseName: string,
  review: Omit<CourseReview, "_id" | "courseName" | "createdAt" | "updatedAt" | "status"> & {
    status?: CourseReview["status"]
  }
): CourseReview {
  const allReviews = readCourseReviews()
  const courseReviews = allReviews[courseName] || []
  
  const newReview: CourseReview = {
    ...review,
    _id: `review-${now()}`,
    courseName,
    status: review.status || "approved",
    createdAt: now(),
    updatedAt: now(),
  }
  
  allReviews[courseName] = [newReview, ...courseReviews]
  writeCourseReviews(allReviews)
  updateCourseAggregates(courseName, allReviews)
  
  return newReview
}

export function updateCourseReviewById(
  reviewId: string,
  updates: Partial<Pick<CourseReview, "semesterYear" | "semesterTerm" | "overallRating" | "content" | "isAnonymous" | "status">>
): CourseReview | undefined {
  const allReviews = readCourseReviews()

  for (const [courseName, reviews] of Object.entries(allReviews)) {
    const index = reviews.findIndex((review) => review._id === reviewId)
    if (index === -1) continue

    const updatedReview: CourseReview = {
      ...reviews[index],
      ...updates,
      updatedAt: now(),
    }
    reviews[index] = updatedReview
    allReviews[courseName] = reviews
    writeCourseReviews(allReviews)
    updateCourseAggregates(courseName, allReviews)
    return updatedReview
  }

  return undefined
}

export function deleteCourseReviewById(reviewId: string): boolean {
  const allReviews = readCourseReviews()

  for (const [courseName, reviews] of Object.entries(allReviews)) {
    const nextReviews = reviews.filter((review) => review._id !== reviewId)
    if (nextReviews.length === reviews.length) continue

    allReviews[courseName] = nextReviews
    writeCourseReviews(allReviews)
    updateCourseAggregates(courseName, allReviews)
    return true
  }

  return false
}

export function addCourse(courseName: string): Course {
  return addCourseWithDetails({ name: courseName.trim() })
}

export function addCourseWithDetails(input: Pick<Course, "name"> & { isTongClassCourse?: boolean }): Course {
  const name = input.name.trim()

  if (!name) {
    throw new Error("Missing required course fields")
  }

  const courses = getCourses()
  if (courses.some((course) => course.name === name)) {
    throw new Error("Course already exists")
  }
  
  const newCourse: Course = {
    _id: `course-${now()}`,
    name,
    isTongClassCourse: input.isTongClassCourse ?? false,
    reviewCount: 0,
    averageRating: 0,
    createdAt: now(),
    updatedAt: now(),
  }
  
  writeToStorage(COURSES_KEY, [...courses, newCourse])
  
  // Initialize reviews
  const allReviews = readCourseReviews()
  allReviews[name] = []
  writeCourseReviews(allReviews)
  
  return newCourse
}

export function updateCourseById(
  courseId: string,
  updates: Partial<Pick<Course, "name" | "isTongClassCourse">>
): Course | undefined {
  const courses = getCourses()
  const index = courses.findIndex((course) => course._id === courseId)
  if (index === -1) return undefined

  const currentCourse = courses[index]
  const nextName = updates.name?.trim() || currentCourse.name

  if (nextName !== currentCourse.name && courses.some((course) => course._id !== courseId && course.name === nextName)) {
    throw new Error("Course already exists")
  }

  const updatedCourse: Course = {
    ...currentCourse,
    ...updates,
    name: nextName,
    updatedAt: now(),
  }

  const nextCourses = [...courses]
  nextCourses[index] = updatedCourse
  writeToStorage(COURSES_KEY, nextCourses)

  if (nextName !== currentCourse.name) {
    const allReviews = readCourseReviews()
    const renamedReviews = (allReviews[currentCourse.name] || []).map((review) => ({
      ...review,
      courseName: nextName,
      updatedAt: now(),
    }))
    const existingTargetReviews = allReviews[nextName] || []
    allReviews[nextName] = [...renamedReviews, ...existingTargetReviews]
    delete allReviews[currentCourse.name]
    writeCourseReviews(allReviews)
    updateCourseAggregates(nextName, allReviews)
  }

  return updatedCourse
}
