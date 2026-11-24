/**
 * @typedef {{home: number | null, away: number | null, status: string, minute: string | null}} Score
 * @typedef {Score & {id: number}} LiveFixture
 * @typedef {object} ScoreboardSnapshot
 * @property {string} instance
 * @property {number} revision
 * @property {'auto' | 'manual'} mode
 * @property {boolean} canAuto
 * @property {Score} score
 * @property {LiveFixture | null} live
 * @property {string | null} checkedAt
 * @property {number | null} remaining
 * @property {number} interval
 * @property {string | null} error
 * @property {string | null} storageError
 */

export {};
