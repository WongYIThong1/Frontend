import { supabaseService } from "@/lib/supabase"

const USER_FILES_BUCKET = "user-files"

export const USER_FILES_BUCKET_NAME = USER_FILES_BUCKET

export function getUserPrefix(userId: string) {
  return `${userId}/`
}

export function sanitizeFileName(fileName: string) {
  // 简单规则：保留字母数字、点、减号、下划线，其他全部替换为下划线
  const cleaned = fileName.replace(/[^\w.\-]+/g, "_")
  // 避免空字符串
  return cleaned || "file"
}

export function getUserObjectPath(userId: string, fileName: string) {
  const prefix = getUserPrefix(userId)
  const safeName = sanitizeFileName(fileName)
  return `${prefix}${safeName}`
}

export function getStorageClient() {
  if (!supabaseService || typeof (supabaseService as any).storage === "undefined") {
    throw new Error("Supabase storage client is not configured on the server.")
  }
  return (supabaseService as any).storage
}


