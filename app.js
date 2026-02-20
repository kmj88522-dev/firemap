// 지도 초기화
const map = L.map('map').setView([35.3218, 126.9880], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let photoQueue = []; // 압축된 사진 저장소

// 1. 사진 촬영 및 자동 압축
function takePhoto() {
    document.getElementById('cameraInput').click();
}

document.getElementById('cameraInput').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1024; // 사진 크기 강제 축소
            let width = img.width, height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(blob => {
                const compressed = new File([blob], `photo_${Date.now()}.jpg`, {type: "image/jpeg"});
                photoQueue.push(compressed);
                document.getElementById('photoCountBadge').innerText = `사진: ${photoQueue.length}장`;
            }, 'image/jpeg', 0.7); // 품질 70%로 압축
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

// 2. 일괄 전송 (Web Share API)
async function sendAllData() {
    // 여기에 기존 엑셀 데이터를 다시 파일로 만드는 로직이 들어가야 합니다.
    const testExcel = new File(["임시데이터"], "점검결과.xlsx", {type: "application/vnd.ms-excel"});
    const filesArray = [testExcel, ...photoQueue];

    if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        await navigator.share({
            files: filesArray,
            title: '소방용수 결과 보고',
            text: '받는사람: kmj88522@korea.kr'
        });
    } else {
        alert("이 브라우저는 공유 기능을 지원하지 않습니다.");
    }
}
