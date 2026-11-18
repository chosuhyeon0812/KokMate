/* 설정 화면 (홈 오른쪽 위 ⚙️): 글자 크기, 팀 공유, 백업 파일 만들기·불러오기 */
import { FontSizeSetting } from '../components/TeamCard';
import Backup from './Backup';

export default function Settings() {
  return (
    <>
      <div className="card">
        <FontSizeSetting />
      </div>
      <Backup />
    </>
  );
}
