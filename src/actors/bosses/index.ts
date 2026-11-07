import type { ActorType } from "../../sim/types";
import type { Behavior } from "../Behavior";
import { flame } from "./flame";
import { giant, shadow } from "./giant";
import { mirror } from "./mirror";
import { king } from "./king";
import { judge } from "./judge";
import { prophet } from "./prophet";
import { door } from "./door";
import { child } from "../child/child";
import { ishtar } from "../ishtar/ishtar";

export const BOSS_BEHAVIORS: Partial<Record<ActorType, Behavior>> = { flame, giant, shadow, mirror, king, judge, prophet, child, ishtar, door };
