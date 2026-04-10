/**
 * MSW pentru Storybook: aceleași handler-e ca în testele Vitest (`handlers.ts`),
 * plus completări pentru pagini Etapa 1/2, brain, agregate stats, notificări.
 */
import { handlers as vitestHandlers } from "./handlers.js";
import { storybookSupplementHandlers } from "./storybook-supplement-handlers.js";

export const storybookHandlers = [...vitestHandlers, ...storybookSupplementHandlers];
