/* 팀 공유: 팀 데이터를 Supabase 에 올려두고 같은 팀 코드를 쓰는 기기끼리 맞춘다.
 *
 * - 이 기기의 데이터(localStorage)는 그대로 쓰고, 바뀔 때마다 서버에도 올린다. 인터넷이 없으면 모아뒀다가 연결되면 올린다.
 * - 서버에는 버전 번호가 있어서, 그사이 다른 기기가 먼저 저장했으면 서버 데이터를 받아 그 위에 이 기기의 변경을 다시 얹은 뒤 올린다.
 * - 다른 기기가 저장하면 바로 알림(broadcast)을 받아서 새 데이터를 가져온다. 알림을 놓쳐도 주기적으로 확인한다.
 */
import { useSyncExternalStore } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../supabaseConfig';
import { getState, applyRemoteState, applyMutator, setLocalChangeHook } from '../store';

export const syncEnabled = !!(SUPABASE_URL && SUPABASE_KEY);

const TEAM_KEY = 'bm-team-v1'; // {code, name, version, dirty} - 이 기기가 참여한 팀
const LEFTOVER_KEY = 'bm-offline-leftover'; // 서버에 못 올리고 덮인 이 기기 데이터 (혹시 몰라 남겨둠)
const POLL_MS = 15000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0/O, 1/I 는 뺐다

const client = syncEnabled ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;

let team = readTeam();
let status = { phase: 'idle', lastSyncedAt: null, message: '' }; // phase: idle | saving | offline | error
let queue = []; // 서버에 아직 안 올라간 이 기기의 변경 (null 은 "통째로 바꾸기")
let pushing = false;
let pushTimer = null;
let channel = null;
let snapshot = { team, status };
const listeners = new Set();

function readTeam() {
  try { return JSON.parse(localStorage.getItem(TEAM_KEY)); } catch (e) { return null; }
}

function saveTeam() {
  if (team) localStorage.setItem(TEAM_KEY, JSON.stringify(team));
  else localStorage.removeItem(TEAM_KEY);
  snapshot = { team: team && { ...team }, status };
  listeners.forEach(l => l());
}

function setStatus(patch) {
  status = { ...status, ...patch };
  snapshot = { team: team && { ...team }, status };
  listeners.forEach(l => l());
}

async function rpc(fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw error;
  return data;
}

async function fetchTeam(code) {
  const rows = await rpc('get_team', { p_code: code });
  return rows && rows.length ? rows[0] : null;
}

function failStatus(e) {
  if (!navigator.onLine) setStatus({ phase: 'offline', message: '' });
  else setStatus({ phase: 'error', message: e && e.message ? e.message : String(e) });
}

/* ---------- 올리기 ---------- */

function onLocalChange(mutator) {
  if (!team) return;
  queue.push(mutator);
  team.dirty = true;
  saveTeam();
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 300);
}

async function push() {
  if (!team || pushing) return;
  pushing = true;
  setStatus({ phase: 'saving' });
  try {
    for (let tries = 0; tries < 5; tries++) {
      if (!queue.length && !team.dirty) break;
      const sent = queue.length;
      const v = await rpc('save_team', { p_code: team.code, p_state: getState(), p_base_version: team.version });
      if (!team) return; // 올리는 사이에 팀에서 나갔으면 그만
      if (v != null) {
        queue = queue.slice(sent); // 올리는 사이에 생긴 변경은 남겨서 한 번 더 올린다
        team.version = v;
        team.dirty = queue.length > 0;
        saveTeam();
        notifyOthers();
        continue;
      }
      await rebase();
    }
    if (queue.length || team.dirty) throw new Error('다른 기기와 저장이 계속 겹쳐요. 잠시 뒤 다시 시도할게요.');
    setStatus({ phase: 'idle', lastSyncedAt: Date.now() });
  } catch (e) {
    failStatus(e);
  } finally {
    pushing = false;
  }
}

// 그사이 다른 기기가 먼저 저장했을 때: 서버 데이터를 받아 이 기기의 변경을 그 위에 다시 적용한다.
async function rebase() {
  const row = await fetchTeam(team.code);
  if (!row) throw new Error('팀을 찾을 수 없어요. 팀이 지워졌을 수 있어요.');

  if (queue.includes(null)) {
    // 백업 불러오기처럼 통째로 바꾼 경우에는 이 기기 데이터로 덮어쓴다.
    team.version = row.version;
    saveTeam();
    return;
  }

  if (!queue.length) {
    // 앱을 다시 연 뒤라 무엇을 바꿨는지 목록이 없다. 서버 데이터를 따르고, 이 기기 데이터는 따로 남겨둔다.
    localStorage.setItem(LEFTOVER_KEY, JSON.stringify({ savedAt: Date.now(), state: getState() }));
    applyRemoteState(row.state);
    team.version = row.version;
    team.dirty = false;
    saveTeam();
    setStatus({ message: '인터넷이 끊긴 동안 이 기기에서 바꾼 내용이 다른 기기의 저장과 겹쳐서, 팀 데이터로 맞췄어요.' });
    return;
  }

  let next = row.state;
  let skipped = 0;
  for (const m of queue) {
    try { next = applyMutator(next, m); } catch (e) { skipped++; }
  }
  applyRemoteState(next);
  team.version = row.version;
  saveTeam();
  if (skipped) setStatus({ message: `다른 기기에서 먼저 바뀐 내용과 겹쳐 이 기기의 변경 ${skipped}개는 반영되지 않았어요.` });
}

/* ---------- 받아오기 ---------- */

async function pull() {
  if (!team || pushing || queue.length || team.dirty) return;
  try {
    const v = await rpc('get_team_version', { p_code: team.code });
    if (v == null) throw new Error('팀을 찾을 수 없어요. 팀이 지워졌을 수 있어요.');
    if (v !== team.version) {
      const row = await fetchTeam(team.code);
      if (!team || pushing || queue.length || team.dirty) return; // 받는 사이에 이 기기에서 바뀌었으면 올리기를 먼저
      applyRemoteState(row.state);
      team.version = row.version;
      team.name = row.name;
      saveTeam();
    }
    setStatus({ phase: 'idle', lastSyncedAt: Date.now() });
  } catch (e) {
    failStatus(e);
  }
}

function tick() {
  if (!team) return;
  if (queue.length || team.dirty) push();
  else pull();
}

/* ---------- 실시간 알림 ---------- */

function connect() {
  disconnect();
  channel = client.channel('team-' + team.code);
  channel.on('broadcast', { event: 'changed' }, () => pull()).subscribe();
}

function disconnect() {
  if (channel) client.removeChannel(channel);
  channel = null;
}

function notifyOthers() {
  if (channel) channel.send({ type: 'broadcast', event: 'changed', payload: {} });
}

/* ---------- 화면에서 쓰는 것들 ---------- */

export function startSync() {
  if (!syncEnabled) return;
  setLocalChangeHook(onLocalChange);
  window.addEventListener('online', tick);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
  setInterval(tick, POLL_MS);
  if (team) {
    connect();
    tick();
  }
}

export function useSync() {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => snapshot);
}

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

// 사람이 입력한 코드를 저장 형식으로 (띄어쓰기, 하이픈, 소문자 허용)
export function cleanCode(input) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// 보여줄 때는 4글자씩 끊어서
export function formatCode(code) {
  return code.match(/.{1,4}/g).join('-');
}

// 지금 이 기기의 데이터로 새 팀을 만든다.
export async function createTeam(name) {
  const code = newCode();
  await rpc('create_team', { p_code: code, p_name: name, p_state: getState() });
  team = { code, name, version: 1, dirty: false };
  queue = [];
  saveTeam();
  connect();
  setStatus({ phase: 'idle', lastSyncedAt: Date.now(), message: '' });
}

// 참여하기 전에 팀 이름과 내용을 미리 확인한다. 없는 코드면 null.
export async function previewTeam(code) {
  return fetchTeam(code);
}

// 팀에 참여한다. 이 기기의 데이터는 팀 데이터로 바뀐다.
export function joinTeam(code, row) {
  team = { code, name: row.name, version: row.version, dirty: false };
  queue = [];
  applyRemoteState(row.state);
  saveTeam();
  connect();
  setStatus({ phase: 'idle', lastSyncedAt: Date.now(), message: '' });
}

// 공유를 멈춘다. 이 기기의 데이터는 그대로 남는다.
export function leaveTeam() {
  disconnect();
  team = null;
  queue = [];
  saveTeam();
  setStatus({ phase: 'idle', lastSyncedAt: null, message: '' });
}

export function syncNow() {
  tick();
}
