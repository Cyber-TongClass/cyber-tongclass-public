export type QuizAnswer = string | string[] | null;
export interface QuizQuestion {
  id: string;
  type: "single_choice" | "multiple_choice" | "fill_blank";
  stem: string;
  timeLimitSeconds?: number;
  options?: { id: string; text: string }[];
}
export interface QuizStudent {
  id: string;
  studentId: string;
  name: string;
  status: "active" | "disabled";
}
export interface QuizCourse {
  _id: string;
  slug: string;
  title: string;
  term: string;
  description: string;
  published: boolean;
  total?: number;
  completed?: number;
  best?: number | null;
  updated?: number | null;
}
export interface QuizLecture {
  _id: string;
  course: string;
  slug: string;
  title: string;
  order: number;
  bank: string;
  sampling?: "stratified-334";
  drawCount: number;
  published: boolean;
  progress?: { completed: number; best: number; latest: number } | null;
}
export interface QuizBank {
  _id: string;
  key: string;
  title: string;
  status: "draft" | "ready";
  expected: number;
}
export interface QuizCatalog {
  courses: QuizCourse[];
  lectures: QuizLecture[];
  banks: QuizBank[];
}
export interface QuizVerdict {
  correct: boolean;
  answer: string | string[];
  explanation: string;
  timedOut: boolean;
}
export interface QuizAttempt {
  id: string;
  title: string;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  revision: number;
  deadlines: (number | null)[];
  verdicts: (QuizVerdict | null)[];
  serverNow: number;
  status: "active" | "submitted";
  score?: number;
}
export interface QuizHistory {
  id: string;
  title: string;
  status: string;
  score?: number;
  started: number;
}
export interface QuizProgress {
  studentId: string;
  name: string;
  course: string;
  lecture: string;
  completed: number;
  best: number;
  latest: number;
  updated: number;
}
export interface QuizPage<T> {
  page: T[];
  isDone: boolean;
  continueCursor: string;
}
export interface QuizStudentDetail extends QuizStudent {
  enrollments: { course: string; active: boolean }[];
}
export interface QuizQueries {
  "learning:me": QuizStudent | null;
  "learning:courses": QuizCourse[];
  "learning:course": QuizCourse & { lectures: QuizLecture[] };
  "learning:attempt": QuizAttempt;
  "learning:history": QuizPage<QuizHistory>;
}
export interface QuizAdminResults {
  students: QuizPage<QuizStudent>;
  detail: QuizStudentDetail;
  catalog: QuizCatalog;
  progress: QuizPage<QuizProgress>;
  provision: { created: number; updated: number; dryRun: boolean };
  reset: { code: string };
  updateStudent: null;
  enroll: null;
  course: string;
  lecture: string;
  beginBank: string;
  chunk: null;
  finishBank: null;
}

export interface QuizAdminResults {
  courseState: null;
  lectureState: null;
  bankQuestions: import("./quiz-import").ImportedQuizQuestion[];
}
export interface QuizCourse {
  deletedAt?: number;
}
export interface QuizLecture {
  deletedAt?: number;
}

export interface QuizProgressMatrix {
  lectures: QuizLecture[];
  rows: {
    studentId: string;
    name: string;
    cells: Record<string, { completed: number; best: number } | null>;
  }[];
}
export interface QuizAdminResults {
  progressMatrix: QuizProgressMatrix;
}
