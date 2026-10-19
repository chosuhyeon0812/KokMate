/* 사용법: 모임 날 순서 4단계만 크게 보여주고, 나머지는 눌러서 펼쳐 보게 한다. */
const STEPS = [
  { icon: '👋', title: '참석자 고르기', lines: ['코트 탭 → "오늘 참석자 선택"', '오늘 온 사람만 눌러서 저장'] },
  { icon: '🏟', title: '코트 등록', lines: ['"코트 번호"에 숫자를 적고 "코트 추가"', '예: 3번, 5번 코트'] },
  { icon: '🛠', title: '경기 만들기', lines: ['빈 코트의 "이 코트에서 경기 만들기"', '4명 고르고 "경기 시작"', '팀은 코트에서 가위바위보로'] },
  { icon: '🏁', title: '경기 끝나면', lines: ['"경기 종료" 한 번 누르기', '잘못 눌렀으면 "되돌리기"'] },
];

const MORE = [
  { icon: '🕒', title: '대기 코트', desc: '코트가 다 찼을 때 "대기 코트 추가"로 다음 경기 4명을 미리 정해둬요(최대 3개). 경기가 끝나면 대기 코트를 바로 시작할지 물어봐요.' },
  { icon: '🙋', title: '누구를 넣을까?', desc: '"쉬는 사람"은 경기 수가 적고 오래 쉰 사람이 앞에 와요. 20분 넘게 쉰 사람은 쉰 시간이 주황색으로 보여요. 파란 칸은 남자, 분홍 칸은 여자예요.' },
  { icon: '🎯', title: '자동 추천', desc: '"추천 받기"를 누르면 조합을 대신 짜줘요. 그대로 시작하거나 "수정", 마음에 안 들면 "삭제"나 "추천 지우기"를 누르세요.' },
  { icon: '😴', title: '휴식', desc: '"휴식 관리"에서 잠깐 쉬는 사람을 빼둘 수 있어요. "쉬는 사람" 칸 아래 휴식 중인 사람을 누르면 바로 복귀해요.' },
  { icon: '🏸', title: '콕 관리', desc: '"콕" 탭에서 콕을 낸 사람은 "−"를 눌러 "✓"로 바꾸세요. 따로 적을 게 있으면 비고 칸에 쓰면 돼요.' },
  { icon: '🌙', title: '모임 끝날 때', desc: '코트 탭 맨 위 "모임 종료"를 누르면 오늘 기록이 "기록" 탭에 저장되고, 경기 수·콕·오늘 참석자가 다음 모임을 위해 초기화돼요. 회원 명단은 그대로예요.' },
  { icon: '👥', title: '회원 추가·수정', desc: '"참가자" 탭 → "참가자 추가"(여러 명은 "여러 명 추가"). 회원을 누르면 이름·성별·급수·역할을 고칠 수 있어요.' },
  { icon: '⚙️', title: '팀 공유 (오른쪽 위 ⚙️)', desc: '같은 팀에 들어간 휴대폰끼리 회원과 기록이 자동으로 맞춰져요. "초대 링크 보내기"로 카톡방에 링크를 보내면, 받은 사람은 링크를 누르고 "참여하기"만 누르면 돼요. 그만 쓰려면 "팀 나가기".' },
  { icon: '💾', title: '백업', desc: '"기록" 탭 → "공유·백업"에서 가끔 백업 파일을 만들어 두세요. 휴대폰을 바꿀 때 "백업 불러오기"로 되살릴 수 있어요.' },
];

export default function Help() {
  return (
    <>
      <div className="card">
        <h2>❓ 모임 날 이렇게 쓰세요</h2>
        <ol className="help-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="help-step">
              <span className="help-num">{i + 1}</span>
              <div>
                <div className="help-step-title">{s.icon} {s.title}</div>
                {s.lines.map(l => <div key={l} className="help-step-line">{l}</div>)}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="card">
        <h2>💡 더 알아보기</h2>
        <p className="muted" style={{ margin: '-4px 0 10px', fontSize: '.9rem' }}>궁금한 항목을 눌러보세요.</p>
        {MORE.map(m => (
          <details key={m.title} className="help-more">
            <summary>{m.icon} {m.title}</summary>
            <p>{m.desc}</p>
          </details>
        ))}
      </div>
    </>
  );
}
