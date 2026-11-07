import { NO_INPUT, type InputFrame } from "../../sim/types";
import type { Bot } from "./BotKit";

/** No input, ever. Used to prove loss → retry and Stillness paths. */
export class PassiveBot implements Bot { name = "passive"; next(): InputFrame { return NO_INPUT; } }
