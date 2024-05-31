import React, { useEffect, useState, useMemo } from "react"
import { navigate } from "gatsby"
import { connect } from "react-redux";
import URI from "urijs"
// these two libraries are client-side only
import LoginComponent from 'summit-registration-lite/dist/components/login';
import PasswordlessLoginComponent from 'summit-registration-lite/dist/components/login-passwordless';
import FragmentParser from "openstack-uicore-foundation/lib/utils/fragment-parser";
import { doLogin, passwordlessStart } from 'openstack-uicore-foundation/lib/security/methods'
import { setPasswordlessLogin, setUserOrder, checkOrderData } from "@openeventkit/event-site/src/actions/user-actions";
import { getThirdPartyProviders } from "@openeventkit/event-site/src/actions/base-actions";
import { validateIdentityProviderButtons } from "@utils/loginUtils";
import 'summit-registration-lite/dist/index.css';
import styles from '@openeventkit/event-site/src/styles/login-button.module.scss'
import PropTypes from 'prop-types'
import Link from "@openeventkit/event-site/src/components/Link";

import { PHASES } from "@utils/phasesUtils";
import { getDefaultLocation } from "@utils/loginUtils";
import { userHasAccessLevel, VirtualAccessLevel } from "@utils/authorizedGroups";

import useSiteSettings from "@utils/useSiteSettings";

const AuthComponent = ({
    getThirdPartyProviders,
    availableThirdPartyProviders,
    setPasswordlessLogin,
    summit,
    marketingPageSettings,
    allowsNativeAuth,
    allowsOtpAuth,
    isLoggedUser,
    summitPhase,
    userProfile,
    eventRedirect,
    location,
    ignoreAutoOpen,
    style = {},
    renderLoginButton = null,
    renderEnterButton = null
}) => {
    const [isActive, setIsActive] = useState(false);
    const [initialEmailValue, setInitialEmailValue] = useState('');
    const [otpLogin, setOtpLogin] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [otpLength, setOtpLength] = useState(null);
    const [otpError, setOtpError] = useState(false);

    const hasVirtualBadge = useMemo(() =>
        userProfile ? userHasAccessLevel(userProfile.summit_tickets, VirtualAccessLevel) : false
        , [userProfile]);
    const defaultPath = getDefaultLocation(eventRedirect, hasVirtualBadge);

    useEffect(() => {
        const fragmentParser = new FragmentParser();
        if(!ignoreAutoOpen) {
            // to show the login dialog check if we are already logged or not
            setIsActive(fragmentParser.getParam('login') && !isLoggedUser);
        }
        const paramInitialEmailValue = fragmentParser.getParam('email');
        if (paramInitialEmailValue)
            setInitialEmailValue(paramInitialEmailValue);
    }, []);

    useEffect(() => {
        if (!availableThirdPartyProviders.length) getThirdPartyProviders();
    }, [availableThirdPartyProviders]);

    const getBackURL = (encode = true) => {
        let backUrl = location.state?.backUrl
            ? location.state.backUrl
            : '/';
        const fragmentParser = new FragmentParser();
        const paramBackUrl = fragmentParser.getParam('backurl');
        if (paramBackUrl)
            backUrl = paramBackUrl;
        return encode ? URI.encode(backUrl) : backUrl;
    };

    const onClickLogin = (provider) => {
        doLogin(getBackURL(), provider, null, initialEmailValue || null);
    };

    const handleClosePopup = () => {
        setIsActive(false);
        setOtpLogin(false);
        setOtpError(false);
    }

    const handleOpenPopup = () => {
        setIsActive(true);
        setOtpLogin(false);
        setOtpError(false);
    }

    const handleEnterEvent = () => {
        navigate(defaultPath);
    }

    const getPasswordlessCode = (email) => {
        const backUrl = getBackURL(true)
        const params = {
            connection: "email",
            send: "code",
            redirect_uri: `${window.location.origin}/auth/callback?BackUrl${backUrl}`,
            email,
        };

        return passwordlessStart(params)
    };

    const loginPasswordless = (code, email) => {
        const params = {
            connection: "email",
            otp: code,
            email
        };

        return setPasswordlessLogin(params).then((res) => {
            return res;
        }).catch((e) => {
            console.log(e);
            setOtpError(true);
            return Promise.reject("Invalid OTP");
        })
    };

    const sendCode = (email) => {
        setUserEmail(email);
        getPasswordlessCode(email).then(({ response }) => {
            setOtpLength(response.otp_length);
            setOtpLogin(true);
        });
    }

    const siteSettings = useSiteSettings();

    const loginComponentProps = {
        loginOptions: validateIdentityProviderButtons(siteSettings?.identityProviderButtons, availableThirdPartyProviders),
        login: (provider) => onClickLogin(provider),
        getLoginCode: (email) => sendCode(email),
        allowsNativeAuth: allowsNativeAuth,
        allowsOtpAuth: allowsOtpAuth,
        initialEmailValue: initialEmailValue,
        title: 'Sign in using the email associated with your account:',
        summitData: summit,
    };

    const passwordlessLoginProps = {
        email: userEmail,
        codeLength: otpLength,
        passwordlessLogin: (code) => loginPasswordless(code, userEmail).then(() => {
            // close popup and then navigate bc its its the same origin page
            // it would not reload and closed the popup automatically
            handleClosePopup();
            navigate(getBackURL(false))
        }).catch((e) => console.log(e)),
        codeError: otpError,
        goToLogin: () => setOtpLogin(false),
        getLoginCode: (email) => sendCode(email),
        idpLogoLight: siteSettings?.idpLogo?.idpLogoLight?.publicURL,
        idpLogoDark: siteSettings?.idpLogo?.idpLogoDark?.publicURL,
        idpLogoAlt: siteSettings?.idpLogo?.idpLogoAlt
    }

    const { loginButton } = marketingPageSettings.hero.buttons;

    const defaultLoginButton = () => (
        <button className={`${styles.button} button is-large`} onClick={handleOpenPopup} style={{ backgroundColor: "#00657F" }}>
            <i className={`fa fa-2x fa-edit icon is-large`} />
            <b>{loginButton.text}</b>
        </button>
    );

    const defaultEnterButton = () => (
        <Link className={styles.link} to={defaultPath} style={{ backgroundColor: "#00657F" }}>
            <button className={`${styles.button} button is-large`}>
                <i className={`fa fa-2x fa-sign-in icon is-large`} />
                <b>Enter</b>
            </button>
        </Link>
    );

    return (
        <div style={style} className={styles.loginButtonWrapper}>
            {!isLoggedUser ?
                renderLoginButton ? renderLoginButton(handleOpenPopup) : defaultLoginButton()
                :
                (summitPhase >= PHASES.DURING && hasVirtualBadge ?
                    renderEnterButton ? renderEnterButton(handleEnterEvent) : defaultEnterButton()
                    :
                    null
                )
            }
            {isActive &&
                <div id={`${styles.modal}`} className="modal is-active">
                    <div className="modal-background"></div>
                    <div className={`${styles.modalContent} modal-content`}>
                        <div className={`${styles.outerWrapper} summit-registration-lite`}>
                            <div className={styles.innerWrapper}>
                                <div className={styles.title}>
                                    <span>{summit.name}</span>
                                    <i className="fa fa-close" aria-label="close" onClick={handleClosePopup}></i>
                                </div>
                                {!otpLogin && <LoginComponent {...loginComponentProps} />}
                                {otpLogin && <PasswordlessLoginComponent {...passwordlessLoginProps} />}
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    )
};

const mapStateToProps = ({ userState, summitState, settingState, clockState, loggedUserState }) => {
    return ({
        loadingProfile: userState.loading,
        loadingIDP: userState.loadingIDP,
        availableThirdPartyProviders: summitState.third_party_providers,
        allowsNativeAuth: summitState.allows_native_auth,
        allowsOtpAuth: summitState.allows_otp_auth,
        summit: summitState.summit,
        colorSettings: settingState.colorSettings,
        userProfile: userState.userProfile,
        marketingPageSettings: settingState.marketingPageSettings,
        summitPhase: clockState.summit_phase,
        isLoggedUser: loggedUserState.isLoggedUser,
        // TODO: move to site settings i/o marketing page settings
        eventRedirect: settingState.marketingPageSettings.eventRedirect
    })
};

export default connect(mapStateToProps, {
    getThirdPartyProviders,
    setPasswordlessLogin,
    setUserOrder,
    checkOrderData
})(AuthComponent)

AuthComponent.defaultProps = {
    ignoreAutoOpen: false,
}

AuthComponent.propTypes = {
    location: PropTypes.object.isRequired,
    ignoreAutoOpen: PropTypes.bool,
}
