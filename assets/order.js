/* 구매·회원가입 신청 폼
   서버에 저장하지 않는다. 작성한 내용은 방문자 본인의 문자로만 나간다. */
(function () {
  'use strict';

  var TEL = '01076357886';
  var IS_PHONE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  var form = document.getElementById('orderForm');
  var doneBox = document.getElementById('doneBox');
  var errBox = document.getElementById('formErr');
  var summaryBox = document.getElementById('summaryBox');
  var smsBtn = document.getElementById('smsBtn');
  var copyBtn = document.getElementById('copyBtn');
  var editBtn = document.getElementById('editBtn');
  var copyNote = document.getElementById('copyNote');
  var lastText = '';

  function val(id) { return (document.getElementById(id).value || '').trim(); }

  function showErr(msg, focusId) {
    errBox.textContent = msg;
    errBox.hidden = false;
    if (focusId) {
      var el = document.getElementById(focusId);
      el.focus();
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function buildText() {
    var addr = val('f-addr') + (val('f-addr2') ? ' ' + val('f-addr2') : '');
    return [
      '[진지노 소비자 회원가입 신청]',
      '1. 이름: ' + val('f-name'),
      '2. 영문이름: ' + val('f-en'),
      '3. 성별: ' + val('f-sex'),
      '4. 생년월일: ' + val('f-birth'),
      '5. 휴대전화: ' + val('f-tel'),
      '6. 주소: ' + addr,
      '7. 이메일: ' + val('f-email'),
      '',
      '회원가입 및 개인정보 수집·이용에 동의합니다.'
    ].join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); res(); } catch (e) { rej(e); }
      document.body.removeChild(ta);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;

    var required = [
      ['f-name', '이름을 적어주세요.'],
      ['f-en', '영문이름을 적어주세요.'],
      ['f-sex', '성별을 골라주세요.'],
      ['f-birth', '생년월일을 적어주세요.'],
      ['f-tel', '휴대전화 번호를 적어주세요.'],
      ['f-addr', '주소를 적어주세요.'],
      ['f-email', '이메일을 적어주세요.']
    ];
    for (var i = 0; i < required.length; i++) {
      if (!val(required[i][0])) return showErr(required[i][1], required[i][0]);
    }
    var tel = val('f-tel').replace(/[^0-9]/g, '');
    if (tel.length < 10 || tel.length > 11) return showErr('휴대전화 번호를 다시 확인해 주세요.', 'f-tel');
    var email = val('f-email');
    if (email.indexOf('@') < 1 || email.lastIndexOf('.') < email.indexOf('@')) {
      return showErr('이메일 주소를 다시 확인해 주세요.', 'f-email');
    }
    if (!document.getElementById('f-agree').checked) {
      return showErr('회원가입 및 개인정보 수집·이용 동의가 필요합니다.', 'f-agree');
    }

    lastText = buildText();
    summaryBox.textContent = lastText;
    smsBtn.href = 'sms:' + TEL + (/iPhone|iPad|Macintosh/.test(navigator.userAgent) ? '&' : '?') +
                  'body=' + encodeURIComponent(lastText);

    form.hidden = true;
    doneBox.hidden = false;
    doneBox.scrollIntoView({ block: 'start', behavior: 'smooth' });

    /* PC 에서는 문자 앱이 없어 sms 링크가 아무 일도 하지 않는다.
       그래서 PC 로 들어온 분에게만 다른 길을 안내한다. */
    if (!IS_PHONE) {
      smsBtn.textContent = '내용 복사하고 문자 보내기';
      copyNote.innerHTML = 'PC 에서는 문자 앱이 열리지 않습니다. 아래 버튼을 누르면 내용이 복사됩니다. ' +
                           '휴대폰 문자로 <b>010-7635-7886</b> 에 붙여넣어 보내주세요.';
      smsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        copyText(lastText).then(function () {
          smsBtn.textContent = '복사했습니다';
          setTimeout(function () { smsBtn.textContent = '내용 복사하고 문자 보내기'; }, 2400);
        });
      });
    }
  });

  copyBtn.addEventListener('click', function () {
    copyText(lastText).then(function () {
      copyBtn.textContent = '복사했습니다';
      setTimeout(function () { copyBtn.textContent = '내용 복사하기'; }, 2200);
    }).catch(function () {
      copyBtn.textContent = '길게 눌러 복사해 주세요';
    });
  });

  /* 추천인 코드 복사: 손으로 옮겨 적다 틀리는 일을 막는다 */
  var codeCopyBtn = document.getElementById('codeCopyBtn');
  if (codeCopyBtn) {
    codeCopyBtn.addEventListener('click', function () {
      var code = document.getElementById('sponsorCode').textContent.trim();
      copyText(code).then(function () {
        codeCopyBtn.textContent = '복사했습니다';
        setTimeout(function () { codeCopyBtn.textContent = '복사'; }, 2200);
      }).catch(function () {
        codeCopyBtn.textContent = '길게 눌러 복사';
      });
    });
  }

  editBtn.addEventListener('click', function () {
    doneBox.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
})();
