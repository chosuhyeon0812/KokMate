/* 카카오톡 공유: 팀 초대를 카톡 카드(그림 + "팀 참여하기" 버튼)로 보낸다.
 * SDK는 처음 누를 때만 불러온다. (안 쓰는 사람은 받을 필요 없고, 인터넷이 없어도 앱은 열려야 하므로)
 * JavaScript 키는 원래 웹페이지에 넣어 쓰는 공개용이다. 카카오 개발자 사이트에 등록한 주소에서만 동작한다.
 */
const KAKAO_JS_KEY = 'eb91b1ee18291e37211da00b17df8fd7';
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';

let loading = null;

function loadKakao() {
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
  }
  return loading;
}

// link: 초대 링크(…/?team=코드). 그림도 같은 주소에서 가져온다.
export async function shareTeamInvite(teamName, link) {
  const Kakao = await loadKakao();
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
}
