/* 처음 여는 기기에서 보이는 화면: 팀 만들기 / 팀 코드로 참여 / 이 기기에서만 쓰기.
   예전부터 쓰던 기기(저장된 데이터가 있는 기기)나 팀에 들어간 기기에서는 보이지 않는다. */
import logo from '../assets/logo.svg';
import { NoTeam } from '../components/TeamCard';

export default function Welcome({ onSkip, initialCode }) {
  return (
    <main className="welcome">
      <div className="card welcome-card">
        <img src={logo} alt="" className="welcome-logo" />
        <h2 className="welcome-title">배드민턴 매칭</h2>
        {initialCode ? (
          <p className="welcome-desc">초대받은 팀 코드가 들어가 있어요.<br />팀을 확인하고 <b>참여하기</b>를 누르세요.</p>
        ) : (
          <p className="welcome-desc">
            우리 모임 팀 코드가 있으면 <b>팀 코드로 참여</b>를 누르세요.<br />
            모임장이 처음 시작한다면 <b>팀 만들기</b>를 누르면 돼요.
          </p>
        )}
        <NoTeam initialCode={initialCode} />
        <button type="button" className="welcome-skip" onClick={onSkip}>{initialCode ? '참여하지 않고 닫기' : '팀 없이 이 기기에서만 쓰기'}</button>
      </div>
    </main>
  );
}
