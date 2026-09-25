export interface User {
  id: string
  name: string | null
  email: string | null
  telefone: string | null
  role: string | null
  gender: string | null
  birth_date: string | null
  status: string | null
  must_change_password: boolean
  atribuicoes?: string[] | null
  created_at: string | null
  updated_at: string | null
  teacher_profile?: TeacherProfile | null
}

export interface TeacherProfile {
  user_id: string
  bio: string | null
  specialties: string | null
  experience_years: number | null
  availability: string | null
}

export interface Unit {
  id: string
  name: string | null
  address: string | null
  coordinator_id: string | null
  status: string | null
  created_at: string | null
}

export interface Book {
  id: string
  title: string | null
  author: string | null
  level: string | null
  description: string | null
  isbn: string | null
  active: boolean | null
  chapters: BookChapter[]
}

export interface BookChapter {
  id: string
  book_id: string
  title: string | null
  order_index: number | null
}

export interface Class_ {
  id: string
  name: string | null
  level: string | null
  unit_id: string | null
  main_teacher_id: string | null
  book_id: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  schedule_weekday: number | null  // 0 = segunda … 6 = domingo
  schedule_start: string | null    // "HH:MM:SS", horário local
  schedule_end: string | null
  assignments: ClassAssignment[]
  student_count?: number | null  // só vem na listagem
}

export interface ClassAssignment {
  id: string
  class_id: string
  teacher_id: string
  role: string | null
}

export interface ClassStudentSummary {
  student_id: string
  full_name: string | null
  attendance_rate: number
  attendance_total: number
  grade_average: number | null
}

export interface ClassSummary {
  class_id: string
  student_count: number
  attendance_rate: number
  attendance_total: number
  grade_average: number | null
  students: ClassStudentSummary[]
}

export interface Student {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  gender: string | null
  birth_date: string | null
  unit_id: string | null
  status: string | null
  created_at: string | null
  address: string | null
  rg: string | null
  cpf: string | null
  education_level: string | null
  guardian_name: string | null
  guardian_rg: string | null
  guardian_cpf: string | null
  terms_accepted: boolean | null
  image_consent: boolean | null
}

export interface Enrollment {
  id: string
  student_id: string
  class_id: string
  enrollment_date: string | null
  status: string | null
}

export interface Lesson {
  id: string
  class_id: string | null
  teacher_id: string | null
  book_id: string | null
  chapter_id: string | null
  scheduled_at: string | null
  status: string | null
  report?: LessonReport | null
  materials: LessonMaterial[]
}

export interface LessonReport {
  id: string
  lesson_id: string
  summary: string | null
  activities_done: string | null
  homework: string | null
  observations: string | null
  created_at: string | null
}

export interface LessonMaterial {
  id: string
  lesson_id: string
  type: string | null
  title: string | null
  content: string | null
}

export interface Attendance {
  id: string
  lesson_id: string
  student_id: string
  status: string | null
  check_in_time: string | null
  notes: string | null
  homework_status: HomeworkStatus | null  // null = não verificado
}

export interface Assessment {
  id: string
  class_id: string | null
  title: string | null
  type: string | null
  semester: string | null
  date: string | null
  max_score: number | null
  min_score: number | null
  created_by: string | null
  grades: StudentGrade[]
}

export interface StudentGrade {
  id: string
  assessment_id: string
  student_id: string
  score: number | null
  feedback: string | null
  created_at: string | null
}

export interface CalendarEvent {
  id: string
  unit_id: string | null
  title: string | null
  description: string | null
  event_type: string | null
  start_date: string | null
  end_date: string | null
  is_all_day: boolean | null
  created_by: string | null
  visibility: string | null
}

export interface BookLoan {
  id: string
  student_id: string
  book_id: string
  borrowed_at: string
  due_date: string | null
  returned_at: string | null
  status: string
  notes: string | null
  student: { id: string; full_name: string | null } | null
  book: { id: string; title: string | null; author: string | null } | null
}

export interface Activity {
  id: string
  class_id: string | null
  title: string | null
  description: string | null
  type: string | null
  date: string | null
  created_by: string | null
}

export interface StudentHighlight {
  id: string
  student_id: string
  class_id: string | null
  teacher_id: string | null
  title: string | null
  description: string | null
  highlight_type: string | null
  created_at: string | null
  student_occupation: string | null
  reason_primary: string | null
  reason_secondary: string | null
  level_assessment: string | null
  participation_spontaneous: string | null
  class_focus: string | null
  interest_beyond_class: string | null
  speaks_despite_errors: string | null
  curiosity_level: string | null
  homework_rate: string | null
  english_outside_contact: string | null
  english_outside_channels: string | null
  self_confidence: string | null
  previously_highlighted: string | null
  teacher_overall_perception: string | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ApiError {
  detail: string
}

export type AlertType = "attendance_risk" | "negative_highlight" | "homework_check" | "overdue_loan" | "lesson_on_holiday" | "low_grade"
  | "positive_highlight" | "class_without_teacher" | "lesson_missing_attendance" | "teacher_inactive"

export interface Alert {
  key: string
  type: AlertType
  severity: "high" | "medium" | "low"
  ref_id: string
  student_id: string | null
  student_name: string | null
  student_phone: string | null
  teacher_name: string | null
  teacher_phone: string | null
  class_id: string | null
  class_name: string | null
  lesson_id: string | null
  title: string
  detail: string
  occurred_at: string | null
  last_followup: { resolution: string; note: string | null; created_by_name: string | null; created_at: string } | null
}

export interface Followup {
  id: string
  alert_type: AlertType
  ref_id: string
  student_id: string | null
  resolution: "resolved" | "snoozed"
  note: string | null
  snooze_until: string | null
  created_by_name: string | null
  created_at: string
}

export interface UpcomingLesson {
  id: string
  class_id: string
  class_name: string | null
  unit_id: string | null
  scheduled_at: string
  status: string | null
  attendance_count: number
  has_report: boolean
}

// Dever de casa na chamada: fez / não fez / não se aplica
export type HomeworkStatus = "done" | "not_done" | "na"

export interface AnalysisStudent {
  id: string
  full_name: string | null
  gender: string | null
  birth_date: string | null
  age: number | null
  education_level: string | null
  unit_id: string | null
  unit_name: string | null
  status: string | null
  created_at: string | null
  classes: { id: string; name: string | null; level: string | null; book: string | null }[]
  attendance_rate: number | null
}

export interface PeriodStats {
  period: "30d" | "semester" | "year"
  start: string
  end: string
  previous_start: string
  previous_end: string
  new_students: { current: number; previous: number }
  lessons_given: { current: number; previous: number }
  attendance_rate: { current: number; previous: number }
  absences: { current: number; previous: number }
}
