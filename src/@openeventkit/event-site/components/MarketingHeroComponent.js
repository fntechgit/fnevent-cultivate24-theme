import React, {
  useRef,
  useState,
  useEffect
} from "react";
import { GatsbyImage, getImage, getSrc } from "gatsby-plugin-image";
import Slider from "react-slick";
import AuthComponent from "./AuthComponent";
import RegistrationLiteComponent from "./RegistrationLiteComponent";

import styles from "@openeventkit/event-site/src/styles/marketing-hero.module.scss";

const MarketingHeroComponent = ({
  location,
  data,
}) => {

  const sliderRef = useRef(null);
  const [sliderHeight, setSliderHeight] = useState(424);

  const onResize = () => {
    sliderRef?.current && setSliderHeight(sliderRef.current.clientHeight);
  };

  useEffect(() => {
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);


  const getButtons = () => {
    const {
      registerButton,
      loginButton
    } = data?.buttons || {};

    return <>
      {registerButton?.display &&
      <span className={styles.link}>
        <RegistrationLiteComponent location={location} />
      </span>
      }
      {loginButton?.display &&
        <AuthComponent location={location} />
      }
    </>;
  };

  const sliderSettings = {
    autoplay: true,
    autoplaySpeed: 5000,
    infinite: true,
    dots: false,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  let heroLeftColumnInlineStyles = {};
  if (data?.background?.src) {
    const imageSrc = getSrc(data.background.src);
    heroLeftColumnInlineStyles.backgroundImage = `url(${imageSrc})`;
  }

  return (
    <section className={styles.heroMarketing}>
      <div className={`${styles.heroMarketingColumns} columns is-gapless`}>
        <div
          className={`${styles.leftColumn} column is-6`}
          style={heroLeftColumnInlineStyles}
        >
          <div className={`${styles.heroMarketingContainer} hero-body`}>
            <div className="container">
              <h1 className="title" style={{ color: "#00657F" }}>{data?.title}</h1>
              <h2 className="subtitle">{data?.subTitle}</h2>
              <h4 style={{ color: "rgb(44, 44, 44)", marginTop: 30 }}>{data?.date}</h4>
              <h4 style={{ color: "rgb(44, 44, 44)" }}>{data?.time}</h4>
              <div className={styles.heroButtons}>
                {getButtons()}
              </div>
            </div>
          </div>
        </div>
        {data?.images?.length > 0 && (
        <div
          className={`${styles.rightColumn} column is-6 px-0`}
          id="marketing-slider"
          ref={sliderRef}
        >
          <Slider {...sliderSettings}>
            {data.images.map((image, index) => (
              <div key={index}>
                <GatsbyImage
                  image={getImage(image.src)}
                  alt={image.alt}
                  style={{ height: sliderHeight, marginBottom: -6 }}
                />
              </div>
            ))}
          </Slider>
        </div>
        )}
      </div>
    </section>
  );
}

export default MarketingHeroComponent;
