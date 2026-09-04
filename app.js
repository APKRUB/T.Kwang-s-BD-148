const supabaseUrl = 'https://xpuxusyeicegrbmbnaix.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdXh1c3llaWNlZ3JibWJuYWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0ODA4MzAsImV4cCI6MjEwNDA1NjgzMH0.nIxNFFXhKBM__1qrae57J_xCdnXMkecRPW-GT1cVUPA';

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
// 2. ระบบกระดานซองจดหมายหน้า cards.html (ลอย + ลาก + Popup)
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
            const maxX = window.innerWidth - 200;
            const maxY = window.innerHeight - 200;
            const randomX = Math.max(20, Math.random() * maxX);
            const randomY = Math.max(100, Math.random() * maxY);

            const wrapper = document.createElement('div');
            wrapper.className = 'envelope-wrapper draggable floating';
            
            wrapper.style.setProperty('--startX', `${randomX}px`);
            wrapper.style.setProperty('--startY', `${randomY}px`);
            wrapper.style.transform = `translate(${randomX}px, ${randomY}px)`;
            
            wrapper.setAttribute('data-x', randomX);
            wrapper.setAttribute('data-y', randomY);
            wrapper.style.animationDelay = `${Math.random() * 3}s`;

            const envelope = document.createElement('div');
            envelope.className = `envelope ${greeting.envelope_style}`;
            envelope.innerText = `To: Birthday Boy/Girl\nFrom: ${greeting.sender_name}`;
            
            wrapper.appendChild(envelope);
            container.appendChild(wrapper);

            let isDragging = false;
            wrapper.addEventListener('pointerdown', () => { isDragging = false; });
            wrapper.addEventListener('pointermove', () => { isDragging = true; });
            
            wrapper.addEventListener('click', () => {
                if (!isDragging) {
                    openCardPopup(greeting);
                }
            });
        });

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

function dragMoveListener (event) {
    var target = event.target;
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    target.style.setProperty('--startX', `${x}px`);
    target.style.setProperty('--startY', `${y}px`);
    target.style.transform = `translate(${x}px, ${y}px)`;

    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}

function openCardPopup(greeting) {
    document.getElementById('popup-sender').innerText = `จาก: ${greeting.sender_name}`;
    document.getElementById('popup-message').innerText = greeting.message;

    const imgContainer = document.getElementById('popup-image-container');
    if (greeting.image_url) {
        imgContainer.innerHTML = `<img src="${greeting.image_url}" alt="รูปแนบ" style="max-width: 100%; border-radius: 10px; margin-top: 15px;">`;
    } else {
        imgContainer.innerHTML = '';
    }

    document.getElementById('card-popup').classList.add('active');
}

function closeCardPopup() {
    document.getElementById('card-popup').classList.remove('active');
}
