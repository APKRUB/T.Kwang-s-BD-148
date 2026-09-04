// 1. ใส่ URL และ Key ของคุณ
const supabaseUrl = 'https://xpuxusyeicegrbmbnaix.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdXh1c3llaWNlZ3JibWJuYWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0ODA4MzAsImV4cCI6MjEwNDA1NjgzMH0.nIxNFFXhKBM__1qrae57J_xCdnXMkecRPW-GT1cVUPA';

// 2. ใช้ window.supabase เพื่อบังคับให้ระบบไปเรียกตัวหลัก ลดปัญหา Error
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

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
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabaseClient.storage
                .from('birthday-images')
                .upload(fileName, file);
                
            if (uploadError) throw uploadError;
            
            const { data } = supabaseClient.storage
                .from('birthday-images')
                .getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        const { error: dbError } = await supabaseClient
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
// 2. ระบบกระดานซองจดหมาย (แบบลอยและ Popup)
// ==========================================
async function loadGreetings() {
    const container = document.getElementById('envelopes-container');
    if (!container) return;

    try {
        const { data, error } = await supabaseClient
            .from('greetings')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;

        data.forEach((greeting) => {
            // สุ่มตำแหน่งให้อยู่ในกรอบหน้าจอ
            const maxX = window.innerWidth - 180;
            const maxY = window.innerHeight - 150;
            const randomX = Math.max(20, Math.random() * maxX);
            const randomY = Math.max(100, Math.random() * maxY);

            // สร้าง Wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'envelope-wrapper floating';
            wrapper.style.left = `${randomX}px`;
            wrapper.style.top = `${randomY}px`;
            // สุ่มให้แต่ละซองลอยจังหวะไม่พร้อมกัน
            wrapper.style.animationDelay = `${Math.random() * 3}s`;

            // สร้างตัวซอง
            const envelope = document.createElement('div');
            envelope.className = `envelope ${greeting.envelope_style}`;
            envelope.innerText = `To: Birthday Boy/Girl\nFrom: ${greeting.sender_name}`;
            
            wrapper.appendChild(envelope);
            container.appendChild(wrapper);

            // กดที่ซองแล้วเปิด Pop-up
            wrapper.addEventListener('click', () => {
                openCardPopup(greeting);
            });
        });

    } catch (error) {
        console.error('Error fetching greetings:', error.message);
    }
}

// ฟังก์ชันสำหรับเปิด Pop-up
function openCardPopup(greeting) {
    document.getElementById('popup-sender').innerText = `จาก: ${greeting.sender_name}`;
    document.getElementById('popup-message').innerText = greeting.message;

    const imgContainer = document.getElementById('popup-image-container');
    if (greeting.image_url) {
        imgContainer.innerHTML = `<img src="${greeting.image_url}" alt="รูปแนบ">`;
    } else {
        imgContainer.innerHTML = '';
    }

    document.getElementById('card-popup').classList.add('active');
}

// ฟังก์ชันสำหรับปิด Pop-up
function closeCardPopup() {
    document.getElementById('card-popup').classList.remove('active');
}
