# 팀 공유(Supabase) 설정 방법

> **현재 상태 (2026-10-19)**: 설정 완료. 프로젝트 `mpfbfmidhdkemtdfenej`에 `schema.sql`을 실행했고,
> 주소와 공개 키는 `src/supabaseConfig.js`에 들어 있습니다. 아래 순서는 새 프로젝트로 다시 만들 때 참고용입니다.

팀 공유 기능은 Supabase 프로젝트 주소와 공개 키만 넣으면 켜집니다. (`src/supabaseConfig.js`가 비어 있으면 팀 기능이 숨겨짐)
아래 1~3번을 하고, 3번에서 복사한 두 값을 Claude에게 붙여넣어 주세요. (10분 정도)

## 1. 가입하고 프로젝트 만들기

1. https://supabase.com 접속 → **Start your project** → **GitHub로 로그인**
2. **New project** 클릭
   - Name: `badminton-matcher`
   - Database Password: **Generate a password** 누르고, 메모장 등에 따로 적어두기
     (**Claude에게 보내지 말 것.** 앱에는 필요 없음)
   - Region: **Northeast Asia (Seoul)**
   - Plan: **Free**
3. **Create new project** 누르고 2분 정도 기다리기

## 2. 데이터 칸 만들기 (복사 → 붙여넣기 한 번)

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 폴더의 `schema.sql` 내용을 **전부 복사**해서 붙여넣기
3. 오른쪽 아래 **Run** → "Success. No rows returned" 가 나오면 끝

## 3. 주소와 공개 키 복사해서 Claude에게 보내기

왼쪽 아래 **Project Settings → API Keys** (또는 Data API) 에서:

- **Project URL**: `https://○○○○.supabase.co`
- **Publishable key**: `sb_publishable_...` 로 시작 (예전 화면이면 **anon public** 키)

⚠️ **secret 키 / service_role 키는 절대 보내지 말 것.** 그 키가 있으면 모든 데이터를 마음대로 바꿀 수 있음.
publishable(anon) 키는 원래 앱에 넣는 공개용이라 괜찮음.

## 알아둘 점

- 카카오 로그인을 붙이기 전까지는 **팀 코드(12자리)가 열쇠**입니다. 코드를 아는 사람은 팀 데이터를 보고 바꿀 수 있어요.
- Supabase 무료 플랜은 **일주일 동안 아무도 안 쓰면 잠깐 멈춥니다.** 대시보드에서 프로젝트를 열고 Restore를 누르면 다시 켜집니다. 오래 쉴 때는 앱에서 백업 파일을 만들어 두세요.
- 팀 이름은 처음 만들 때 `teams.name`에 저장되고, 앱에서 바꾸면 팀 데이터 안의 `state.teamName`에 저장됩니다. (서버 함수를 따로 추가하지 않으려고)

## 다음 단계

카카오 로그인 + 권한
- 팀을 만든 사람 = 대빵 모임장 (누구도 내릴 수 없음, 팀 없애기는 대빵 모임장만)
- 모임장: 가입 승인, 모임장/운영진 역할 주기, 일반 회원으로 내리기
- 운영진: 경기 넣기/고치기
- 일반 회원: 보기만
