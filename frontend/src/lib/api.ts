import axios from "axios"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
  refresh: (refresh_token: string) =>
    api.post("/auth/refresh", { refresh_token }),
}

// Users
export const usersApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get("/users", { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: object) => api.post("/users", data),
  update: (id: string, data: object) => api.patch(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
  getTeacherProfile: (id: string) => api.get(`/users/${id}/teacher-profile`),
  upsertTeacherProfile: (id: string, data: object) =>
    api.put(`/users/${id}/teacher-profile`, data),
}

// Units
export const unitsApi = {
  list: () => api.get("/units"),
  get: (id: string) => api.get(`/units/${id}`),
  create: (data: object) => api.post("/units", data),
  update: (id: string, data: object) => api.patch(`/units/${id}`, data),
}

// Books
export const booksApi = {
  list: () => api.get("/books"),
  get: (id: string) => api.get(`/books/${id}`),
  create: (data: object) => api.post("/books", data),
  update: (id: string, data: object) => api.patch(`/books/${id}`, data),
  addChapter: (id: string, data: object) =>
    api.post(`/books/${id}/chapters`, data),
  updateChapter: (bookId: string, chapterId: string, data: object) =>
    api.patch(`/books/${bookId}/chapters/${chapterId}`, data),
}

// Classes
export const classesApi = {
  list: (params?: { unit_id?: string; status?: string; level?: string }) =>
    api.get("/classes", { params }),
  get: (id: string) => api.get(`/classes/${id}`),
  create: (data: object) => api.post("/classes", data),
  update: (id: string, data: object) => api.patch(`/classes/${id}`, data),
  getStudents: (id: string) => api.get(`/classes/${id}/students`),
  addAssignment: (id: string, data: object) =>
    api.post(`/classes/${id}/assignments`, data),
}

// Students
export const studentsApi = {
  list: (params?: { unit_id?: string; status?: string }) =>
    api.get("/students", { params }),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: object) => api.post("/students", data),
  update: (id: string, data: object) => api.patch(`/students/${id}`, data),
  getEnrollments: (id: string) => api.get(`/students/${id}/enrollments`),
  enroll: (id: string, class_id: string) =>
    api.post(`/students/${id}/enrollments`, { class_id }),
}

// Lessons
export const lessonsApi = {
  list: (params?: {
    class_id?: string
    teacher_id?: string
    status?: string
  }) => api.get("/lessons", { params }),
  get: (id: string) => api.get(`/lessons/${id}`),
  create: (data: object) => api.post("/lessons", data),
  update: (id: string, data: object) => api.patch(`/lessons/${id}`, data),
  upsertReport: (id: string, data: object) =>
    api.post(`/lessons/${id}/report`, data),
  addMaterial: (id: string, data: object) =>
    api.post(`/lessons/${id}/materials`, data),
  getAttendance: (id: string) => api.get(`/lessons/${id}/attendance`),
  registerAttendance: (id: string, records: object[]) =>
    api.post(`/lessons/${id}/attendance`, { records }),
}

// Assessments
export const assessmentsApi = {
  list: (params?: { class_id?: string; semester?: string }) =>
    api.get("/assessments", { params }),
  get: (id: string) => api.get(`/assessments/${id}`),
  create: (data: object) => api.post("/assessments", data),
  update: (id: string, data: object) => api.patch(`/assessments/${id}`, data),
  postGrades: (id: string, grades: object[]) =>
    api.post(`/assessments/${id}/grades`, { grades }),
}

// Calendar
export const calendarApi = {
  list: (params?: {
    unit_id?: string
    start_date?: string
    end_date?: string
  }) => api.get("/calendar/events", { params }),
  create: (data: object) => api.post("/calendar/events", data),
  update: (id: string, data: object) =>
    api.patch(`/calendar/events/${id}`, data),
  delete: (id: string) => api.delete(`/calendar/events/${id}`),
}

// Activities
export const activitiesApi = {
  list: (params?: { class_id?: string }) =>
    api.get("/activities", { params }),
  create: (data: object) => api.post("/activities", data),
  get: (id: string) => api.get(`/activities/${id}`),
  update: (id: string, data: object) => api.patch(`/activities/${id}`, data),
  postResponses: (id: string, responses: object[]) =>
    api.post(`/activities/${id}/student-responses`, { responses }),
}

// Highlights
export const highlightsApi = {
  list: (params?: { student_id?: string; class_id?: string }) =>
    api.get("/highlights", { params }),
  create: (data: object) => api.post("/highlights", data),
  update: (id: string, data: object) => api.patch(`/highlights/${id}`, data),
}

// Audit
export const auditApi = {
  list: (params?: { skip?: number; limit?: number; entity_type?: string; user_id?: string }) =>
    api.get("/audit/logs", { params }),
}
