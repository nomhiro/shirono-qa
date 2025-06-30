import { User } from '@/types/auth'
import { Question } from '@/types/question'

export interface GroupPermission {
  canAccess: boolean
  canManage: boolean
  role: 'admin' | 'member' | 'none'
}

/**
 * 質問にアクセスできるかチェック
 */
export function canAccessQuestion(user: User, question: Question): boolean {
  if (!user || !question) {
    return false
  }

  // 管理者は全てアクセス可能
  if (user.isAdmin) {
    return true
  }

  // 質問の作成者は常にアクセス可能
  if (question.authorId === user.id) {
    return true
  }

  // 同じグループのメンバーはアクセス可能
  if (user.groupId && question.groupId && user.groupId === question.groupId) {
    return true
  }

  return false
}

/**
 * 質問を編集できるかチェック
 */
export function canEditQuestion(user: User, question: Question): boolean {
  if (!user || !question) {
    return false
  }

  // 管理者は全て編集可能
  if (user.isAdmin) {
    return true
  }

  // 質問の作成者のみ編集可能
  if (question.authorId === user.id) {
    return true
  }

  return false
}

/**
 * 質問を削除できるかチェック
 */
export function canDeleteQuestion(user: User, question: Question): boolean {
  if (!user || !question) {
    return false
  }

  // 管理者は全て削除可能
  if (user.isAdmin) {
    return true
  }

  // 質問の作成者のみ削除可能
  if (question.authorId === user.id) {
    return true
  }

  return false
}

/**
 * グループにアクセスできるかチェック
 */
export function canAccessGroup(user: User, groupId: string): boolean {
  if (!user || !groupId) {
    return false
  }

  // 管理者は全グループアクセス可能
  if (user.isAdmin) {
    return true
  }

  // 自分のグループにはアクセス可能
  if (user.groupId === groupId) {
    return true
  }

  return false
}

/**
 * グループに対する詳細な権限情報を取得
 */
export function checkGroupPermission(user: User, groupId: string): GroupPermission {
  if (!user || !groupId) {
    return {
      canAccess: false,
      canManage: false,
      role: 'none'
    }
  }

  // 管理者の場合
  if (user.isAdmin) {
    return {
      canAccess: true,
      canManage: true,
      role: 'admin'
    }
  }

  // 自分のグループの場合
  if (user.groupId === groupId) {
    return {
      canAccess: true,
      canManage: false,
      role: 'member'
    }
  }

  // その他の場合
  return {
    canAccess: false,
    canManage: false,
    role: 'none'
  }
}

/**
 * 質問リストにグループベースフィルタを適用
 */
export function filterQuestionsByAccess(user: User, questions: Question[]): Question[] {
  if (!user || !questions) {
    return []
  }

  // 管理者は全て見える
  if (user.isAdmin) {
    return questions
  }

  // 一般ユーザーは自分がアクセス可能な質問のみ
  return questions.filter(question => canAccessQuestion(user, question))
}

/**
 * ユーザーが質問のステータスを変更できるかチェック
 */
export function canChangeQuestionStatus(user: User, question: Question): boolean {
  if (!user || !question) {
    return false
  }

  // 管理者は全て変更可能
  if (user.isAdmin) {
    return true
  }

  // 質問の作成者も自分の質問のステータスを変更可能（解決済みマークなど）
  if (question.authorId === user.id) {
    return true
  }

  return false
}

/**
 * ユーザーが回答できるかチェック
 */
export function canAnswerQuestion(user: User, question: Question): boolean {
  if (!user || !question) {
    return false
  }

  // まず質問にアクセスできるかチェック
  if (!canAccessQuestion(user, question)) {
    return false
  }

  // アクセスできれば回答も可能
  return true
}

/**
 * アクセス制御エラーメッセージを生成
 */
export function getAccessDeniedMessage(action: string): string {
  const messages: Record<string, string> = {
    'view': 'この質問を表示する権限がありません',
    'edit': 'この質問を編集する権限がありません',
    'delete': 'この質問を削除する権限がありません',
    'answer': 'この質問に回答する権限がありません',
    'comment': 'この質問にコメントする権限がありません',
    'status': 'この質問のステータスを変更する権限がありません'
  }

  return messages[action] || 'このアクションを実行する権限がありません'
}