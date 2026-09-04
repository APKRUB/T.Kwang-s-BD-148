// ⚠️ สำคัญมาก: เปลี่ยน 2 บรรทัดนี้เป็นค่าจาก Supabase Project ของคุณ
const supabaseUrl = 'https://xpuxusyeicegrbmbnaix.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdXh1c3llaWNlZ3JibWJuYWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0ODA4MzAsImV4cCI6MjEwNDA1NjgzMH0.nIxNFFXhKBM__1qrae57J_xCdnXMkecRPW-GT1cVUPA';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. ระบบฟอร์มหน้า form.html
// ==========================================
async function submitGreeting(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = 'กำลังส่ง...';
    btn.disabled = true;

    const name = document.getElementById('senderName').value;
    const msg = document.getElementById('message').value;
    const style = document.getElementById('envelopeStyle').value;
    const fileInput = document.getElementById('imageUpload');
    
    let imageUrl = null;

    try {
        // ถ้ายูสเซอร์อัปโหลดรูป
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            // อัปโหลดเข้า Storage Bucket ชื่อ 'birthday-images'
            const { error: uploadError } = await supabase.storage
                .from('birthday-images')
                .upload(fileName, file);
                
            if (uploadError) throw uploadError;
            
            // ดึง URL ที่เป็น Public
            const { data } = supabase.storage
                .from('birthday-images')
                .getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        // บันทึกข้อมูลลงตาราง greetings
        const { error: dbError } = await supabase
            .from('greetings')
            .insert([{ 
                sender_name: name, 
                message: msg, 
                envelope_style: style, 
                image_url: imageUrl 
            }]);
            
        if (dbError) throw dbError;

        alert('ส่งคำอวยพรสำเร็จแล้ว! 💌 ปิดหน้านี้ได้เลย');
        document.getElementById('greeting-form').reset();
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        btn.innerText = 'ส่งคำอวยพร 💌';
        btn.disabled = false;
    }
}

// ==========================================
// 2. ระบบกระดานซองจดหมายหน้า cards.html
// ==========================================
async function loadGreetings() {
    const container = document.getElementById('envelopes-container');
    if (!container) return; // ทำงานเฉพาะตอนอยู่หน้า cards.html

    try {
        // ดึงข้อมูลทั้งหมดจากตาราง greetings
        const { data, error } = await supabase
            .from('greetings')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;

        // สร้างซองจดหมายทีละอัน
        data.forEach((greeting) => {
            // สุ่มตำแหน่ง X Y บนหน้าจอ
            const maxX = window.innerWidth - 200;
            const maxY = window.innerHeight - 250;
            const randomX = Math.max(20, Math.random() * maxX);
            const randomY = Math.max(100, Math.random() * maxY);

            // สร้าง Wrapper (ตัวคลุมที่ใช้ Drag)
            const wrapper = document.createElement('div');
            wrapper.className = 'envelope-wrapper draggable';
            wrapper.style.transform = `translate(${randomX}px, ${randomY}px)`;
            // เก็บพิกัดไว้สำหรับ interact.js
            wrapper.setAttribute('data-x', randomX);
            wrapper.setAttribute('data-y', randomY);

            // สร้างตัวซอง
            const envelope = document.createElement('div');
            envelope.className = `envelope ${greeting.envelope_style}`;
            envelope.innerText = `To: Birthday Boy/Girl\nFrom: ${greeting.sender_name}`;
            
            // สร้างจดหมายด้านใน
            const letter = document.createElement('div');
            letter.className = 'letter';
            letter.innerHTML = `
                <p>${greeting.message}</p>
                ${greeting.image_url ? `<img src="${greeting.image_url}" alt="รูปแนบ">` : ''}
            `;

            // ประกอบร่าง
            wrapper.appendChild(envelope);
            wrapper.appendChild(letter);
            container.appendChild(wrapper);

            // ระบบคลิกเพื่อเปิด-ปิด (Toggle)
            envelope.addEventListener('click', () => {
                // ถ้าเปิดซองนี้อยู่ ให้ซองอื่นปิดให้หมดเพื่อไม่ให้บังกัน (Optional)
                document.querySelectorAll('.envelope-wrapper').forEach(el => {
                    if (el !== wrapper) el.classList.remove('open');
                });
                wrapper.classList.toggle('open');
                
                // เลื่อนซองที่เปิดขึ้นมาอยู่บนสุด
                wrapper.style.zIndex = wrapper.classList.contains('open') ? 10 : 1;
            });
        });

        // เปิดใช้งานระบบ Drag & Drop ด้วย interact.js
        interact('.draggable').draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                move: dragMoveListener,
            }
        });

    } catch (error) {
        console.error('Error fetching greetings:', error.message);
    }
}

// ฟังก์ชันคำนวณตำแหน่งตอนลากซอง (ใช้กับ interact.js)
function dragMoveListener (event) {
    var target = event.target;
    // อ่านค่าตำแหน่งเดิม
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // ขยับ UI
    target.style.transform = `translate(${x}px, ${y}px)`;

    // อัปเดตพิกัดใหม่เก็บไว้
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}
