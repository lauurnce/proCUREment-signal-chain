import { z } from "zod";
import { Id, IsoDate, IsoDateTime } from "./common";

export const TaskStatus = z.enum(["todo", "doing", "waiting", "done"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

/** A board task, from vault/board/<id>.md frontmatter. The body is kept as markdown. */
export const Task = z.object({
  id: Id,
  title: z.string().min(1),
  owner: Id,
  workflow: Id,
  status: TaskStatus,
  created: IsoDateTime,
  due: IsoDate,
  links: z.array(z.string()),
  body: z.string(),
});
export type Task = z.infer<typeof Task>;
