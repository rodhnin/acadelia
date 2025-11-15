document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const mensajeExito = document.getElementById('mensajeExito');
    const submitBtn = form.querySelector('.submit-btn');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        
        try {
            const formData = new FormData(form);
            const data = {
                fullName: formData.get('fullName'),
                reason: formData.get('reason'),
                email: formData.get('email'),
                message: formData.get('message')
            };

            const csrfToken = await window.csrfUtils.getToken();

            const response = await fetch('/api/contact/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                mensajeExito.textContent = '✅ Mensaje enviado con éxito. Revisa tu email para la confirmación.';
                mensajeExito.style.display = 'block';
                mensajeExito.style.background = '#d4edda';
                mensajeExito.style.color = '#155724';
                form.reset();
                
                setTimeout(() => {
                    mensajeExito.style.display = 'none';
                }, 5000);
            } else {
                throw new Error(result.error || 'Error desconocido');
            }

        } catch (error) {
            console.error('Error enviando mensaje:', error);
            
            mensajeExito.textContent = '❌ Error al enviar el mensaje. Inténtalo de nuevo.';
            mensajeExito.style.display = 'block';
            mensajeExito.style.background = '#f8d7da';
            mensajeExito.style.color = '#721c24';
            
            setTimeout(() => {
                mensajeExito.style.display = 'none';
            }, 5000);
        } finally {
            // Rehabilitar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});