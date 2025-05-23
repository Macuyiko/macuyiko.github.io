FROM python:3.13-slim

LABEL "com.github.actions.name"="Pelican for GitHub Pages"
LABEL "com.github.actions.description"="Builds and deploys the Pelican project to GitHub Pages"
LABEL "com.github.actions.icon"="home"
LABEL "com.github.actions.color"="red"

LABEL "Name"="Pelican for GitHub Pages"
LABEL "Version"="0.1.0"

ENV LC_ALL C.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8

RUN apt-get update \
    && apt-get install --no-install-recommends -qy git curl bash ca-certificates gnupg wget locales

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen en_US.UTF-8
    
# Pre-requisites for Pillow, a key requirement for many python-based pelican installs.
# Per https://pillow.readthedocs.io/en/stable/installation.html#
RUN apt-get install -y \
    libffi-dev \
    libfreetype6-dev \
    libfribidi-dev \
    libharfbuzz-dev \
    libjpeg-turbo-progs \
    libjpeg62-turbo-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    libwebp-dev \
    libssl-dev \
    meson \
    netpbm \
    tcl8.6-dev \
    tk8.6-dev \
    xvfb \
    zlib1g-dev 

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["bash", "/entrypoint.sh"]