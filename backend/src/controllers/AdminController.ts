import { or } from "@prisma/orm-postgres/orm-client";
import type { Request, Response } from "express";

import { db } from "../prisma/db.js";
import { isTagIcon, isTagStyle } from "../tags/tagStyles.js";
import { getTagsForUsers, isAdminEmail, TAG_COLUMNS } from "../tags/userTags.js";
import { validateName } from "../users/validation.js";
import { deleteStoredAvatar } from "./UserController.js";

const TAG_NAME_MAX = 20;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const USERS_LIMIT = 50;

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

interface TagFields {
  name?: string;
  color?: string;
  style?: string;
  icon?: string | null;
}

// Lê e valida os campos da tag. Na edição (partial) todos são opcionais.
function readTagFields(body: unknown, partial: boolean): TagFields | string {
  const input = (body ?? {}) as Record<string, unknown>;
  const fields: TagFields = {};

  if (input.name !== undefined || !partial) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name || name.length > TAG_NAME_MAX) {
      return `O nome da tag deve ter entre 1 e ${TAG_NAME_MAX} caracteres.`;
    }
    fields.name = name;
  }

  if (input.color !== undefined || !partial) {
    const color =
      typeof input.color === "string" && input.color.trim() ? input.color.trim() : "#a78bfa";
    if (!COLOR_PATTERN.test(color)) return "Cor inválida. Use o formato #rrggbb.";
    fields.color = color.toLowerCase();
  }

  if (input.style !== undefined || !partial) {
    const style = input.style ?? "classic";
    if (!isTagStyle(style)) return "Estilo de tag inválido.";
    fields.style = style;
  }

  if (input.icon !== undefined) {
    if (input.icon !== null && input.icon !== "" && !isTagIcon(input.icon)) {
      return "Ícone inválido.";
    }
    fields.icon = isTagIcon(input.icon) ? input.icon : null;
  }

  return fields;
}

async function nameTaken(name: string, exceptId?: number): Promise<boolean> {
  const existing = await db.orm.public.Tag.select("id", "name").all();
  return existing.some(
    (tag) => tag.id !== exceptId && tag.name.toLowerCase() === name.toLowerCase(),
  );
}

// Lista todas as tags, com quantos usuários têm cada uma.
export async function listTags(_request: Request, response: Response) {
  try {
    const tags = await db.orm.public.Tag.select(...TAG_COLUMNS)
      .orderBy([(tag) => tag.name.asc()])
      .all();
    const links = await db.orm.public.UserTag.select("tagId").all();

    const counts = new Map<number, number>();
    for (const link of links) {
      counts.set(link.tagId, (counts.get(link.tagId) ?? 0) + 1);
    }

    return response.status(200).json({
      tags: tags.map((tag) => ({ ...tag, users: counts.get(tag.id) ?? 0 })),
    });
  } catch (error) {
    console.error("ERRO AO LISTAR TAGS:", error);
    return response.status(500).json({ message: "Erro ao listar tags." });
  }
}

// Cria uma tag nova (nome único, sem diferenciar maiúsculas).
export async function createTag(request: Request, response: Response) {
  try {
    const fields = readTagFields(request.body, false);
    if (typeof fields === "string") {
      return response.status(400).json({ message: fields });
    }

    if (await nameTaken(fields.name!)) {
      return response.status(409).json({ message: "Já existe uma tag com esse nome." });
    }

    const tag = await db.orm.public.Tag.select(...TAG_COLUMNS).create({
      name: fields.name!,
      color: fields.color!,
      style: fields.style!,
      icon: fields.icon ?? null,
    });

    return response.status(201).json({ tag: { ...tag, users: 0 } });
  } catch (error) {
    console.error("ERRO AO CRIAR TAG:", error);
    return response.status(500).json({ message: "Erro ao criar tag." });
  }
}

// Edita nome, cor, estilo ou ícone de uma tag existente.
export async function updateTag(request: Request, response: Response) {
  try {
    const id = parseId(request.params.tagId);
    if (!id) return response.status(400).json({ message: "Tag inválida." });

    const fields = readTagFields(request.body, true);
    if (typeof fields === "string") {
      return response.status(400).json({ message: fields });
    }
    if (Object.keys(fields).length === 0) {
      return response.status(400).json({ message: "Nada para alterar." });
    }

    const current = await db.orm.public.Tag.select("id").first({ id });
    if (!current) return response.status(404).json({ message: "Tag não encontrada." });

    if (fields.name && (await nameTaken(fields.name, id))) {
      return response.status(409).json({ message: "Já existe uma tag com esse nome." });
    }

    const tag = await db.orm.public.Tag.where({ id }).select(...TAG_COLUMNS).update(fields);
    return response.status(200).json({ tag });
  } catch (error) {
    console.error("ERRO AO EDITAR TAG:", error);
    return response.status(500).json({ message: "Erro ao editar tag." });
  }
}

// Apaga a tag; o banco remove junto as ligações com usuários (cascade).
export async function deleteTag(request: Request, response: Response) {
  try {
    const id = parseId(request.params.tagId);
    if (!id) {
      return response.status(400).json({ message: "Tag inválida." });
    }

    await db.orm.public.Tag.where({ id }).delete();
    return response.status(204).end();
  } catch (error) {
    console.error("ERRO AO APAGAR TAG:", error);
    return response.status(500).json({ message: "Erro ao apagar tag." });
  }
}

// Busca usuários por nome ou email, já com as tags de cada um.
export async function listUsers(request: Request, response: Response) {
  try {
    const search =
      typeof request.query.search === "string" ? request.query.search.trim() : "";

    // Escapa % e _ para a busca ser literal.
    const pattern = `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

    const users = await db.orm.public.User.where((user) =>
      search ? or(user.name.ilike(pattern), user.email.ilike(pattern)) : user.id.gt(0),
    )
      .select("id", "name", "email", "avatarUrl", "banned", "emailVerified")
      .orderBy([(user) => user.name.asc(), (user) => user.id.asc()])
      .limit(USERS_LIMIT)
      .all();

    const tagsByUser = await getTagsForUsers(users.map((user) => user.id));

    return response.status(200).json({
      users: users.map((user) => ({
        ...user,
        avatarUrl: user.avatarUrl ?? null,
        tags: tagsByUser.get(user.id) ?? [],
      })),
    });
  } catch (error) {
    console.error("ERRO AO LISTAR USUÁRIOS:", error);
    return response.status(500).json({ message: "Erro ao listar usuários." });
  }
}

// Coloca uma tag num usuário (não duplica se já tiver).
export async function addUserTag(request: Request, response: Response) {
  try {
    const userId = parseId(request.params.userId);
    const tagId = parseId(request.body?.tagId);

    if (!userId || !tagId) {
      return response.status(400).json({ message: "Usuário ou tag inválidos." });
    }

    const [user, tag, existing] = await Promise.all([
      db.orm.public.User.select("id").first({ id: userId }),
      db.orm.public.Tag.select("id").first({ id: tagId }),
      db.orm.public.UserTag.select("id").first({ userId, tagId }),
    ]);

    if (!user || !tag) {
      return response.status(404).json({ message: "Usuário ou tag não encontrados." });
    }

    if (!existing) {
      await db.orm.public.UserTag.create({ userId, tagId });
    }

    const tagsByUser = await getTagsForUsers([userId]);
    return response.status(200).json({ tags: tagsByUser.get(userId) ?? [] });
  } catch (error) {
    console.error("ERRO AO ADICIONAR TAG:", error);
    return response.status(500).json({ message: "Erro ao adicionar tag." });
  }
}

// Tira uma tag do usuário.
export async function removeUserTag(request: Request, response: Response) {
  try {
    const userId = parseId(request.params.userId);
    const tagId = parseId(request.params.tagId);

    if (!userId || !tagId) {
      return response.status(400).json({ message: "Usuário ou tag inválidos." });
    }

    await db.orm.public.UserTag.where({ userId, tagId }).delete();

    const tagsByUser = await getTagsForUsers([userId]);
    return response.status(200).json({ tags: tagsByUser.get(userId) ?? [] });
  } catch (error) {
    console.error("ERRO AO REMOVER TAG:", error);
    return response.status(500).json({ message: "Erro ao remover tag." });
  }
}

// Dados que só o admin vê no perfil de alguém.
export async function getUserAdminInfo(request: Request, response: Response) {
  try {
    const id = parseId(request.params.userId);
    if (!id) return response.status(400).json({ message: "Usuário inválido." });

    const user = await db.orm.public.User.select(
      "id",
      "email",
      "emailVerified",
      "banned",
    ).first({ id });
    if (!user) return response.status(404).json({ message: "Usuário não encontrado." });

    return response.status(200).json({
      ...user,
      // A conta de admin não pode ser banida nem apagada por aqui.
      isAdmin: isAdminEmail(user.email),
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR DADOS DO USUÁRIO:", error);
    return response.status(500).json({ message: "Erro ao buscar o usuário." });
  }
}

// Troca o nome e/ou bane/desbane o usuário.
export async function updateUser(request: Request, response: Response) {
  try {
    const id = parseId(request.params.userId);
    if (!id) return response.status(400).json({ message: "Usuário inválido." });

    const target = await db.orm.public.User.select("id", "email").first({ id });
    if (!target) return response.status(404).json({ message: "Usuário não encontrado." });

    const changes: { name?: string; banned?: boolean } = {};

    if (request.body?.name !== undefined) {
      const result = validateName(request.body.name);
      if ("error" in result) return response.status(400).json({ message: result.error });
      changes.name = result.name;
    }

    if (request.body?.banned !== undefined) {
      if (typeof request.body.banned !== "boolean") {
        return response.status(400).json({ message: "Valor inválido." });
      }
      if (request.body.banned && isAdminEmail(target.email)) {
        return response.status(400).json({ message: "Não dá para banir a conta de admin." });
      }
      changes.banned = request.body.banned;
    }

    if (Object.keys(changes).length === 0) {
      return response.status(400).json({ message: "Nada para alterar." });
    }

    const updated = await db.orm.public.User.where({ id })
      .select("id", "name", "banned")
      .update(changes);

    return response.status(200).json({ user: updated });
  } catch (error) {
    console.error("ERRO AO ALTERAR USUÁRIO:", error);
    return response.status(500).json({ message: "Erro ao alterar o usuário." });
  }
}

// Apaga um resultado de teste específico do usuário.
export async function deleteUserTypingResult(request: Request, response: Response) {
  try {
    const userId = parseId(request.params.userId);
    const resultId = parseId(request.params.resultId);
    if (!userId || !resultId) {
      return response.status(400).json({ message: "Resultado inválido." });
    }

    await db.orm.public.TypingResult.where({ id: resultId, userId }).delete();
    return response.status(204).end();
  } catch (error) {
    console.error("ERRO AO APAGAR RESULTADO:", error);
    return response.status(500).json({ message: "Erro ao apagar o resultado." });
  }
}

// Zera os resultados do usuário (testes, battle e Arcade).
export async function deleteUserResults(request: Request, response: Response) {
  try {
    const userId = parseId(request.params.userId);
    if (!userId) return response.status(400).json({ message: "Usuário inválido." });

    await db.transaction(async (tx) => {
      await tx.orm.public.TypingResult.where({ userId }).deleteAll();
      await tx.orm.public.BattleResult.where({ userId }).deleteAll();
      await tx.orm.public.ArcadeResult.where({ userId }).deleteAll();
    });

    return response.status(204).end();
  } catch (error) {
    console.error("ERRO AO ZERAR RESULTADOS:", error);
    return response.status(500).json({ message: "Erro ao zerar os resultados." });
  }
}

// Apaga a conta de vez (resultados e tags vão junto pelo cascade).
export async function deleteUser(request: Request, response: Response) {
  try {
    const id = parseId(request.params.userId);
    if (!id) return response.status(400).json({ message: "Usuário inválido." });

    const target = await db.orm.public.User.select("id", "email", "avatarUrl").first({ id });
    if (!target) return response.status(404).json({ message: "Usuário não encontrado." });

    if (isAdminEmail(target.email) || id === request.user?.userId) {
      return response.status(400).json({ message: "Não dá para apagar a conta de admin." });
    }

    await db.orm.public.User.where({ id }).delete();
    await deleteStoredAvatar(target.avatarUrl);

    return response.status(204).end();
  } catch (error) {
    console.error("ERRO AO APAGAR CONTA:", error);
    return response.status(500).json({ message: "Erro ao apagar a conta." });
  }
}
