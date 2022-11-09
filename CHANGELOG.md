# [0.2.0](https://github.com/lidofinance/polygon-validators-monitoring/compare/0.1.0...0.2.0) (2022-11-04)


### Bug Fixes

* add additional indexes ([cacb45f](https://github.com/lidofinance/polygon-validators-monitoring/commit/cacb45f70eac504252cc4bd90b464aa137170aeb))
* improve metrics to compute query ([a44782e](https://github.com/lidofinance/polygon-validators-monitoring/commit/a44782e3004e7a6865740131ae9fdc1c45d56002))


### Features

* handle PoLido transition to v2 ([0cb101d](https://github.com/lidofinance/polygon-validators-monitoring/commit/0cb101d0709bbd15d6bd2ba83ee35d06d9987c6f))



# [0.1.0](https://github.com/lidofinance/polygon-validators-monitoring/compare/d9d0906cfae83fabc958ba94ac084c705e497054...0.1.0) (2022-10-21)


### Bug Fixes

* add logIndex to shareEvent entity table index ([c472ebe](https://github.com/lidofinance/polygon-validators-monitoring/commit/c472ebe39d097d731ea18bc1e258ffa38dce3833))
* alert rule ([c07d9d6](https://github.com/lidofinance/polygon-validators-monitoring/commit/c07d9d63fad049fb5433959a02222620c8d05789))
* always ([d244069](https://github.com/lidofinance/polygon-validators-monitoring/commit/d2440698c0e3e3d992bd11773a14e13004fc8133))
* avoid possible undefined access ([d9d0906](https://github.com/lidofinance/polygon-validators-monitoring/commit/d9d0906cfae83fabc958ba94ac084c705e497054))
* avoid requesting all checkpoints at a time ([5018ef1](https://github.com/lidofinance/polygon-validators-monitoring/commit/5018ef1e74df311a01a25dca0a58503599b82e97))
* correct label name ([489bd26](https://github.com/lidofinance/polygon-validators-monitoring/commit/489bd260a77e1aeb3e7124780c324cf73ccb74f9))
* env variable ([572ee66](https://github.com/lidofinance/polygon-validators-monitoring/commit/572ee66334e20af96bd41453c09d166b45d83a1f))
* fix import ([39e2851](https://github.com/lidofinance/polygon-validators-monitoring/commit/39e2851becc8b954f301f763b917797d822f1154))
* fix linters workflow syntax ([#5](https://github.com/lidofinance/polygon-validators-monitoring/issues/5)) ([fd3f1f7](https://github.com/lidofinance/polygon-validators-monitoring/commit/fd3f1f7dd760a708fe05f121681b06f05d371f49))
* fix typo in env variable name ([f74a44e](https://github.com/lidofinance/polygon-validators-monitoring/commit/f74a44e55eb5827070323d8f58fa322a9acf7f15))
* **grafana:** update status dashboard ([36b61dc](https://github.com/lidofinance/polygon-validators-monitoring/commit/36b61dc861c1094de1aa8c6003d7167febde69a8))
* log levels fixes ([b3064ae](https://github.com/lidofinance/polygon-validators-monitoring/commit/b3064ae2336c9dda3fb3f1c900ffce4c43e51f54))
* make dry run great again ([9a3cafe](https://github.com/lidofinance/polygon-validators-monitoring/commit/9a3cafe9870e48d19155b5de02215601d1643457))
* metrics computation bugfix ([79fd34a](https://github.com/lidofinance/polygon-validators-monitoring/commit/79fd34ab64ea1e4c345ed8a6f62dbb83dda3e47e))
* monikers.json mapping in docker-compose ([fb3a526](https://github.com/lidofinance/polygon-validators-monitoring/commit/fb3a526af4d7015c6d935858d802619d24007cd0))
* move workflows to the workflows directory ([afed52d](https://github.com/lidofinance/polygon-validators-monitoring/commit/afed52d212e220994b0bd51c58d49fb379831b06))
* NaN as fromBlock ([473d15f](https://github.com/lidofinance/polygon-validators-monitoring/commit/473d15fb35241d3d3a8846fb8dbf14c65c1013eb))
* no need to keep build-info.json once again ([2d5ce07](https://github.com/lidofinance/polygon-validators-monitoring/commit/2d5ce0763c389a06702073f83befc06318fe7bd4))
* remove unused import ([82fef83](https://github.com/lidofinance/polygon-validators-monitoring/commit/82fef83bc15d5e3d0dd35139d012e367b5abb63b))
* skip env validation on test ([971ff10](https://github.com/lidofinance/polygon-validators-monitoring/commit/971ff10e7388937a917715521a886782aebdbee1))
* squash pre-release migrations ([154fe66](https://github.com/lidofinance/polygon-validators-monitoring/commit/154fe6697964fa1692bcab27cde0aaa706e34665))
* update stMATIC addresses ([9191f9d](https://github.com/lidofinance/polygon-validators-monitoring/commit/9191f9daa04374a9a078a2e4fedf3a4aff075521))


### Features

* actualize wfs ([0c2e3b0](https://github.com/lidofinance/polygon-validators-monitoring/commit/0c2e3b0fc011d1b52132d55ee071f807d006cbf7))
* add build-info.json parser ([c5102b7](https://github.com/lidofinance/polygon-validators-monitoring/commit/c5102b72a5d62363b8cc48dd745a6aa13f436fde))
* add healthcheck for checkpoints ([668ab56](https://github.com/lidofinance/polygon-validators-monitoring/commit/668ab56043102f1136ddcfccc7b4be4c7f7226aa))
* add more lines ([23712bf](https://github.com/lidofinance/polygon-validators-monitoring/commit/23712bf9e6e25d1661f4b53fdf1650a83bcc8732))
* add operators pings ([11cfefd](https://github.com/lidofinance/polygon-validators-monitoring/commit/11cfefd1ec4add839854891187d68b1689b76856))
* add performance metrics and dashboard ([fc8958d](https://github.com/lidofinance/polygon-validators-monitoring/commit/fc8958d4e1e0cbcf0a8886066890aad416571333))
* add prometheus tests wf ([fc039ef](https://github.com/lidofinance/polygon-validators-monitoring/commit/fc039ef386b04848059d8bb529a86fac5ff088af))
* break metrics computation into chunks ([2a1d55c](https://github.com/lidofinance/polygon-validators-monitoring/commit/2a1d55ced8a03d54bc92323fa727f963c9cf70a2))
* compute performance metrics in the separate job ([45e833e](https://github.com/lidofinance/polygon-validators-monitoring/commit/45e833e46c2cc97992efe11c87efda9700163688))
* improve grafana dashboard ([5e043b9](https://github.com/lidofinance/polygon-validators-monitoring/commit/5e043b9e071ccf2972c8000781fb662b5a7eadaa))
* index stake<->unstake events ([d990fb3](https://github.com/lidofinance/polygon-validators-monitoring/commit/d990fb3417444f3e2a6141b2532a896588bcd104))
* make metrics retention a separate job ([e415b77](https://github.com/lidofinance/polygon-validators-monitoring/commit/e415b770c9def7eaf9f0b6514301cf84bc3819c6))
* metrics retention feat to decrease cardinality over time ([8ccc95a](https://github.com/lidofinance/polygon-validators-monitoring/commit/8ccc95a84c9261210fcf7c02944331c5b9ec6a38))
* moniker -> vid ([70eaba7](https://github.com/lidofinance/polygon-validators-monitoring/commit/70eaba7250691391d46b629f46cfdc4c564e300a))
* read monikers on startup from the given file ([7257cfa](https://github.com/lidofinance/polygon-validators-monitoring/commit/7257cfa5feb3cf3db897792a54c55ca202d6aee9))
* read validators monikers from generated json file ([87b7d23](https://github.com/lidofinance/polygon-validators-monitoring/commit/87b7d23006bbfa0ebee8c0a95abac40dc1aea290))
* split metrics and offload computation ([1d5a89b](https://github.com/lidofinance/polygon-validators-monitoring/commit/1d5a89b03985c2692223574885892de394bb2a88))
* store metrics labels as jsonb ([0c20c3a](https://github.com/lidofinance/polygon-validators-monitoring/commit/0c20c3a2b5d4bb07d3d606cda0823640098d881a))
* trace metrics computation state ([9ac8c30](https://github.com/lidofinance/polygon-validators-monitoring/commit/9ac8c309542dcb09942a58abc07f4900e9d9c3e0))
* update grafana dashboard ([922f15f](https://github.com/lidofinance/polygon-validators-monitoring/commit/922f15fe39a7170cc90878819e5e58bd07a134b8))
* updated algorithm for blocks intervals ([2a90ba2](https://github.com/lidofinance/polygon-validators-monitoring/commit/2a90ba2cd2d5f92b2a50834e84df24eb66930d6b))



