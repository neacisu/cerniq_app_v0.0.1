/**
 * Re-export — sursa canonică a workerului consensus (BullMQ, pipeline request→collect→decide):
 * `workers/ai/src/consensus-vote-worker.ts`.
 *
 * Acest fișier evită duplicate de logică și oferă o cale stabilă pentru IDE-uri care deschid
 * `src/consensus-vote-worker.ts` fără importuri directe `@cerniq/db` aici (rezolvare TS2307).
 */
export {
  createConsensusVoteCollectWorker,
  createConsensusVoteDecideWorker,
  createConsensusVoteRequestWorker,
  type ConsensusVoteDecideJob,
} from "../workers/ai/src/consensus-vote-worker.js";
