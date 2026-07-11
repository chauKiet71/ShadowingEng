export const LESSON_LOGIN_MESSAGE = 'Vui lòng đăng nhập để xem bài học.';

export function lessonPath(lessonId: string) {
  return `/bai-hoc/${lessonId}`;
}
