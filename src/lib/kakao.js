/* 카카오톡 공유: 팀 초대를 카톡 카드(그림 + "팀 참여하기" 버튼)로 보낸다.
 * SDK는 팀 정보 화면을 열 때 미리 불러온다. (안 쓰는 사람은 받을 필요 없고, 인터넷이 없어도 앱은 열려야 하므로)
 * 휴대폰 브라우저는 버튼을 누른 그 순간에만 카톡(새 창)을 열어 주므로, 누를 때는 기다리지 않고 바로 보내야 한다.
 * JavaScript 키는 원래 웹페이지에 넣어 쓰는 공개용이다. 카카오 개발자 사이트에 등록한 주소에서만 동작한다.
 */
const KAKAO_JS_KEY = 'eb91b1ee18291e37211da00b17df8fd7';
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';

let loading = null;

export function preloadKakao() {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve(window.Kakao);
      s.onerror = () => { loading = null; s.remove(); reject(new Error('카카오 SDK를 불러오지 못했어요.')); };
      document.head.appendChild(s);
    });
    loading.catch(() => {}); // 미리 불러오다 실패한 건 누를 때 알린다
  }
  return loading;
}

// SDK가 아직 안 왔으면 false (불러오기를 시작해 두므로 잠시 뒤 다시 누르면 된다).
// link: 초대 링크(…/?team=코드). 그림도 같은 주소에서 가져온다.
export function shareTeamInvite(teamName, link) {
  const Kakao = window.Kakao;
  if (!Kakao) { preloadKakao(); return false; }
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
  const origin = new URL(link).origin;
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `콕메이트 "${teamName}" 팀 초대`,
      description: '아래 버튼을 누르고 "참여하기"만 누르면 돼요.',
      imageUrl: `${origin}/icons/icon-512.png`,
      imageWidth: 512,
      imageHeight: 512,
      link: { mobileWebUrl: link, webUrl: link },
    },
    buttons: [{ title: '팀 참여하기', link: { mobileWebUrl: link, webUrl: link } }],
  });
  return true;
}
