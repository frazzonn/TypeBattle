import { db } from "../prisma/db.js";

export interface PublicTag {
  id: number;
  name: string;
  color: string;
  style: string;
  icon: string | null;
}

// Colunas da tag que vão para o frontend.
export const TAG_COLUMNS = ["id", "name", "color", "style", "icon"] as const;

// Quem pode abrir a tela de admin. ADMIN_EMAILS aceita vários, separados por vírgula.
const DEFAULT_ADMIN_EMAILS = "gustavofrazzon22@gmail.com";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAILS)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  return !!email && getAdminEmails().includes(email.trim().toLowerCase());
}

// Tags de vários usuários de uma vez (duas consultas, sem N+1).
export async function getTagsForUsers(
  userIds: number[],
): Promise<Map<number, PublicTag[]>> {
  const tagsByUser = new Map<number, PublicTag[]>();
  if (userIds.length === 0) return tagsByUser;

  const links = await db.orm.public.UserTag.where((link) =>
    link.userId.in(userIds),
  )
    .select("userId", "tagId")
    .orderBy([(link) => link.createdAt.asc(), (link) => link.id.asc()])
    .all();
  if (links.length === 0) return tagsByUser;

  const tagIds = [...new Set(links.map((link) => link.tagId))];
  const tags = await db.orm.public.Tag.where((tag) => tag.id.in(tagIds))
    .select(...TAG_COLUMNS)
    .all();
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  for (const link of links) {
    const tag = tagsById.get(link.tagId);
    if (!tag) continue;

    const list = tagsByUser.get(link.userId) ?? [];
    list.push(tag);
    tagsByUser.set(link.userId, list);
  }

  return tagsByUser;
}
