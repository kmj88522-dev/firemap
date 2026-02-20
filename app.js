// 1. 지도 설정
const map = L.map('map').setView([35.3218, 126.9880], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let photoQueue = []; // 압축 사진 저장소
let excelData = [];   // 엑셀 데이터 저장소

// 2. 엑셀 파일 읽기 (기존 v82 로직 통합)
document.addEventListener('click', function(e) {
    // 파일명 표시 영역 클릭 시 파일 선택창 열기 (기존 방식 유지)
    if(e.target.id === 'fileNameDisplay') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls';
        input.onchange = function(event) {
            const file = event.target.files[0];
            document.getElementById('fileNameDisplay').innerText = file.name;
            readExcel(file);
        };
        input.click();
    }
});

function readExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        excelData = XLSX.utils.sheet_to_json(sheet);
        
        renderData(excelData); // 지도 마커 및 리스트 표시
    };
    reader.readAsArrayBuffer(file);
}

// 3. 지도 마커 및 리스트 출력
function renderData(data) {
    const listContainer = document.getElementById('waterSupplyList');
    listContainer.innerHTML = ''; // 초기화
    
    data.forEach((item, index) => {
        // 지도에 마커 찍기 (위도, 경도 컬럼명이 다를 경우 수정 필요)
        if(item.위도 && item.경도) {
            L.marker([item.위도, item.경도])
             .addTo(map)
             .bindPopup(`<b>${item.시설번호 || '번호없음'}</b><br>${item.주소 || ''}`);
        }

        // 하단 리스트 추가
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <span>${item.시설번호 || index+1}. ${item.주소 || '주소없음'}</span>
            <span style="color:green;">양호</span>
        `;
        listContainer.appendChild(div);
    });
}

// 4. 사진 촬영 및 자동 압축 (오늘 만든 핵심 기능)
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
            const MAX_WIDTH = 1024;
            let width = img.width, height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(blob => {
                const compressed = new File([blob], `점검사진_${Date.now()}.jpg`, {type: "image/jpeg"});
                photoQueue.push(compressed);
                document.getElementById('photoCountBadge').innerText = `사진: ${photoQueue.length}장`;
            }, 'image/jpeg', 0.7);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

// 5. 일괄 전송 (파일 공유 API)
async function sendAllData() {
    if (photoQueue.length === 0 && excelData.length === 0) {
        alert("전송할 데이터가 없습니다.");
        return;
    }

    // 현재 데이터를 다시 엑셀 파일로 변환
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "점검결과");
    const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    const excelFile = new File([wbout], "소방용수_점검결과.xlsx", {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});

    const filesArray = [excelFile, ...photoQueue];

    if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        try {
            await navigator.share({
                files: filesArray,
                title: '소방용수 점검결과 보고',
                text: '수신처: kmj88522@korea.kr'
            });
        } catch (err) {
            console.log("공유 취소됨");
        }
    } else {
        alert("이 브라우저는 일괄 전송을 지원하지 않습니다. 크롬/삼성인터넷을 사용하세요.");
    }
}
