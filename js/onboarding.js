// ============================================
// AKOLABS - Systeme d'Onboarding
// ============================================

var Onboarding = {
    currentSlide: 0,
    totalSlides: 4,
    slidesContainer: null,

    // ---- Verifier si l'onboarding est necessaire ----
    isCompleted: function() {
        return localStorage.getItem('akolabs_onboarding_done') === 'true';
    },

    isTermsAccepted: function() {
        return localStorage.getItem('akolabs_terms_accepted') === 'true';
    },

    // ---- Marquer comme complete ----
    markCompleted: function() {
        localStorage.setItem('akolabs_onboarding_done', 'true');
    },

    markTermsAccepted: function() {
        localStorage.setItem('akolabs_terms_accepted', 'true');
    },

    // ---- Afficher l'onboarding ----
    show: function() {
        var container = document.createElement('div');
        container.id = 'onboarding-screen';
        container.className = 'onboarding-container';

        container.innerHTML = ''
            // SLIDES
            + '<div class="onboarding-slides" id="onboarding-slides">'

            // Slide 1 - Bienvenue
            + '  <div class="onboarding-slide">'
            + '    <div class="slide-icon-container">'
            + '      <img src="assets/images/logo.png" alt="AKOLABS" style="width:80px;height:80px;object-fit:contain;position:relative;z-index:1;" onerror="this.outerHTML=\'<i class=\\\'fas fa-crown slide-icon\\\'></i>\'">'
            + '    </div>'
            + '    <h2 class="slide-title">Bienvenue sur <span class="accent">AKOLABS</span></h2>'
            + '    <p class="slide-description">Votre arsenal digital premium. Decouvrez des outils puissants et des formations exclusives pour reussir dans le monde digital.</p>'
            + '  </div>'

            // Slide 2 - Universe
            + '  <div class="onboarding-slide">'
            + '    <div class="slide-icon-container">'
            + '      <i class="fas fa-globe slide-icon"></i>'
            + '    </div>'
            + '    <h2 class="slide-title"><span class="accent">AKOLABS</span> Universe</h2>'
            + '    <p class="slide-description">Accedez a des outils digitaux premium : IA, creation de contenu, productivite... Le tout dans un seul endroit securise.</p>'
            + '  </div>'

            // Slide 3 - Learning
            + '  <div class="onboarding-slide">'
            + '    <div class="slide-icon-container">'
            + '      <i class="fas fa-graduation-cap slide-icon"></i>'
            + '    </div>'
            + '    <h2 class="slide-title"><span class="accent">AKOLABS</span> Learning</h2>'
            + '    <p class="slide-description">Des formations completes pour maitriser le marketing digital, la creation d\'apps, l\'IA et bien plus encore.</p>'
            + '  </div>'

            // Slide 4 - Affiliation
            + '  <div class="onboarding-slide">'
            + '    <div class="slide-icon-container">'
            + '      <i class="fas fa-hand-holding-usd slide-icon"></i>'
            + '    </div>'
            + '    <h2 class="slide-title">Gagnez de <span class="accent">l\'argent</span></h2>'
            + '    <p class="slide-description">Partagez AKOLABS et gagnez 10% de commission sur chaque vente. Transformez votre reseau en source de revenus.</p>'
            + '  </div>'

            + '</div>'

            // FOOTER
            + '<div class="onboarding-footer">'
            + '  <div class="onboarding-dots" id="onboarding-dots">'
            + '    <div class="onboarding-dot active" data-slide="0"></div>'
            + '    <div class="onboarding-dot" data-slide="1"></div>'
            + '    <div class="onboarding-dot" data-slide="2"></div>'
            + '    <div class="onboarding-dot" data-slide="3"></div>'
            + '  </div>'
            + '  <div class="onboarding-actions">'
            + '    <button class="btn btn-primary btn-lg btn-block" id="onboarding-next-btn" onclick="Onboarding.nextSlide()">'
            + '      <span id="onboarding-btn-text">Suivant</span>'
            + '      <i class="fas fa-arrow-right" id="onboarding-btn-icon"></i>'
            + '    </button>'
            + '  </div>'
            + '  <button class="onboarding-skip" id="onboarding-skip-btn" onclick="Onboarding.skip()">'
            + '    Passer l\'introduction'
            + '  </button>'
            + '</div>';

        document.body.appendChild(container);

        // Ecouter le scroll des slides
        this.slidesContainer = document.getElementById('onboarding-slides');
        if (this.slidesContainer) {
            this.slidesContainer.addEventListener('scroll', function() {
                Onboarding.handleScroll();
            });
        }
    },

    // ---- Gerer le scroll ----
    handleScroll: function() {
        if (!this.slidesContainer) return;
        var scrollLeft = this.slidesContainer.scrollLeft;
        var slideWidth = this.slidesContainer.clientWidth;
        var newSlide = Math.round(scrollLeft / slideWidth);

        if (newSlide !== this.currentSlide) {
            this.currentSlide = newSlide;
            this.updateDots();
            this.updateButton();
        }
    },

    // ---- Mettre a jour les dots ----
    updateDots: function() {
        var dots = document.querySelectorAll('.onboarding-dot');
        for (var i = 0; i < dots.length; i++) {
            if (i === this.currentSlide) {
                dots[i].classList.add('active');
            } else {
                dots[i].classList.remove('active');
            }
        }
    },

    // ---- Mettre a jour le bouton ----
    updateButton: function() {
        var btnText = document.getElementById('onboarding-btn-text');
        var btnIcon = document.getElementById('onboarding-btn-icon');
        var skipBtn = document.getElementById('onboarding-skip-btn');

        if (this.currentSlide >= this.totalSlides - 1) {
            if (btnText) btnText.textContent = 'Commencer';
            if (btnIcon) btnIcon.className = 'fas fa-rocket';
            if (skipBtn) skipBtn.style.display = 'none';
        } else {
            if (btnText) btnText.textContent = 'Suivant';
            if (btnIcon) btnIcon.className = 'fas fa-arrow-right';
            if (skipBtn) skipBtn.style.display = 'block';
        }
    },

    // ---- Slide suivant ----
    nextSlide: function() {
        if (this.currentSlide >= this.totalSlides - 1) {
            // Derniere slide -> terminer
            this.finish();
            return;
        }

        this.currentSlide++;

        if (this.slidesContainer) {
            this.slidesContainer.scrollTo({
                left: this.currentSlide * this.slidesContainer.clientWidth,
                behavior: 'smooth'
            });
        }

        this.updateDots();
        this.updateButton();

        try { Utils.vibrate(30); } catch(e) {}
    },

    // ---- Passer l'intro ----
    skip: function() {
        this.finish();
    },

    // ---- Terminer l'onboarding ----
    finish: function() {
        this.markCompleted();

        var screen = document.getElementById('onboarding-screen');
        if (screen) {
            screen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            screen.style.opacity = '0';
            screen.style.transform = 'scale(1.05)';
            setTimeout(function() {
                screen.remove();
                // Afficher les conditions si pas encore acceptees
                if (!Onboarding.isTermsAccepted()) {
                    Onboarding.showTerms();
                }
            }, 400);
        }
    },

    // ---- Afficher les conditions d'utilisation ----
    showTerms: function() {
        var container = document.createElement('div');
        container.id = 'terms-screen';
        container.className = 'terms-container';

        container.innerHTML = ''
            + '<div class="terms-header">'
            + '  <div class="terms-icon"><i class="fas fa-file-contract"></i></div>'
            + '  <h2 class="terms-title">Conditions d\'utilisation</h2>'
            + '  <p class="terms-subtitle">Veuillez lire et accepter nos conditions</p>'
            + '</div>'

            + '<div class="terms-content">'
            + '  <h3>1. Acceptation des conditions</h3>'
            + '  <p>En utilisant l\'application AKOLABS, vous acceptez les presentes conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser l\'application.</p>'

            + '  <h3>2. Description du service</h3>'
            + '  <p>AKOLABS est une plateforme digitale premium donnant acces a :</p>'
            + '  <ul>'
            + '    <li>Des outils digitaux via AKOLABS Universe</li>'
            + '    <li>Des formations via AKOLABS Learning</li>'
            + '    <li>Un systeme d\'affiliation pour gagner des commissions</li>'
            + '  </ul>'

            + '  <h3>3. Compte utilisateur</h3>'
            + '  <p>Chaque compte est strictement personnel et ne peut etre connecte que sur un seul appareil a la fois. Le partage de compte est interdit et peut entrainer la suspension definitive de votre acces.</p>'

            + '  <h3>4. Achats et paiements</h3>'
            + '  <p>Tous les achats effectues dans l\'application sont definitifs. L\'acces achete est valable a vie sauf en cas de violation des conditions d\'utilisation. Les frais de transaction sont a la charge de l\'acheteur.</p>'

            + '  <h3>5. Propriete intellectuelle</h3>'
            + '  <p>Tout le contenu accessible via AKOLABS (outils, formations, fichiers) est protege par le droit d\'auteur. Il est strictement interdit de :</p>'
            + '  <ul>'
            + '    <li>Copier, redistribuer ou revendre le contenu</li>'
            + '    <li>Extraire les fichiers de l\'application</li>'
            + '    <li>Partager les liens d\'acces avec des tiers</li>'
            + '    <li>Utiliser le contenu a des fins commerciales sans autorisation</li>'
            + '  </ul>'

            + '  <h3>6. Programme d\'affiliation</h3>'
            + '  <p>Le parrain recoit 10% de commission sur chaque vente generee par son lien. Le filleul beneficie de 10% de reduction. Les commissions sont calculees automatiquement et les retraits sont soumis a un minimum.</p>'

            + '  <h3>7. Fichiers telecharges</h3>'
            + '  <p>Les fichiers telecharges dans l\'application sont stockes de maniere securisee et ne sont accessibles que depuis l\'application. Toute tentative d\'extraction est interdite.</p>'

            + '  <h3>8. Suspension de compte</h3>'
            + '  <p>AKOLABS se reserve le droit de suspendre ou supprimer tout compte en cas de violation des presentes conditions, de fraude, ou d\'utilisation abusive.</p>'

            + '  <h3>9. Limitation de responsabilite</h3>'
            + '  <p>AKOLABS ne saurait etre tenu responsable des dommages indirects lies a l\'utilisation de la plateforme. Le service est fourni "en l\'etat".</p>'

            + '  <h3>10. Modification des conditions</h3>'
            + '  <p>AKOLABS se reserve le droit de modifier ces conditions a tout moment. Les utilisateurs seront informes des changements importants par notification dans l\'application.</p>'
            + '</div>'

            + '<div class="terms-footer">'
            + '  <label class="terms-checkbox" onclick="Onboarding.toggleTermsCheckbox()">'
            + '    <input type="checkbox" id="terms-checkbox">'
            + '    <span class="terms-checkbox-label">J\'ai lu et j\'accepte les conditions d\'utilisation et la politique de confidentialite d\'AKOLABS</span>'
            + '  </label>'
            + '  <button class="btn btn-primary btn-lg btn-block" id="terms-accept-btn" disabled onclick="Onboarding.acceptTerms()">'
            + '    <i class="fas fa-check-circle"></i>'
            + '    <span>Accepter et continuer</span>'
            + '  </button>'
            + '</div>';

        document.body.appendChild(container);

        // Animation d'entree
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        requestAnimationFrame(function() {
            container.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });
    },

    // ---- Toggle checkbox conditions ----
    toggleTermsCheckbox: function() {
        var checkbox = document.getElementById('terms-checkbox');
        var btn = document.getElementById('terms-accept-btn');
        if (!checkbox || !btn) return;

        // Le click sur le label va toggler le checkbox automatiquement
        setTimeout(function() {
            btn.disabled = !checkbox.checked;
        }, 50);
    },

    // ---- Accepter les conditions ----
    acceptTerms: function() {
        var checkbox = document.getElementById('terms-checkbox');
        if (!checkbox || !checkbox.checked) {
            Utils.showToast('Veuillez accepter les conditions', 'warning');
            return;
        }

        this.markTermsAccepted();

        try { Utils.vibrate(50); } catch(e) {}

        var screen = document.getElementById('terms-screen');
        if (screen) {
            screen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            screen.style.opacity = '0';
            screen.style.transform = 'translateY(-20px)';
            setTimeout(function() {
                screen.remove();
            }, 400);
        }

        Utils.showToast('Conditions acceptees !', 'success');
    }
};