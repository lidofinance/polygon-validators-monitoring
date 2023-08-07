## [0.7.1](https://github.com/lidofinance/polygon-validators-monitoring/compare/0.7.0...0.7.1) (2023-08-07)


### Bug Fixes

* active set site increased to 105 by PIP4 ([b920de5](https://github.com/lidofinance/polygon-validators-monitoring/commit/b920de5b4f2a2f8282b59364724c093435905221))



# [0.7.0](https://github.com/lidofinance/polygon-validators-monitoring/compare/0.6.0...0.7.0) (2023-06-16)


### Bug Fixes

* default value for CHECKPOINTS_IN_ROW_LIMIT ([1cecba4](https://github.com/lidofinance/polygon-validators-monitoring/commit/1cecba47172fa8ff4c1312827775fd5adb25bf25))
* skip staled checkpoint for multiple misses ([0347d59](https://github.com/lidofinance/polygon-validators-monitoring/commit/0347d59d636c53519b68c79791247dfb3304c2f9))
* use raw query to fetch duties only ([f494e43](https://github.com/lidofinance/polygon-validators-monitoring/commit/f494e43580f5e7d30d82792986cad7781478e738))


### Features

* boilerplate for cli commands ([98c7696](https://github.com/lidofinance/polygon-validators-monitoring/commit/98c769663101bd260281ae25d0ef25bc0331dd8b))
* multiple checkpoints misses in a row ([a779a4c](https://github.com/lidofinance/polygon-validators-monitoring/commit/a779a4cbe76e6ad0427a80740de3fe0794285904))


### Performance Improvements

* replace TypeORM ordered queries with min/max and exists checks ([b51fae4](https://github.com/lidofinance/polygon-validators-monitoring/commit/b51fae4ca6c961a2fa86aac03989e7d862c16c6a))



# [0.6.0](https://github.com/lidofinance/polygon-validators-monitoring/compare/0.5.0...0.6.0) (2023-02-28)


### Bug Fixes

* enable Type ORM logging on LOG_LEVEL=debug ([0b1077c](https://github.com/lidofinance/polygon-validators-monitoring/commit/0b1077c5f088b2da8749c60c62d98bf4b0604b3a))
* postpone PB bump ([a8eb420](https://github.com/lidofinance/polygon-validators-monitoring/commit/a8eb420f4f1ac5fb60f84d544d5c9a153739a61f))


### Features

* add rewards calculation ([#33](https://github.com/lidofinance/polygon-validators-monitoring/issues/33)) ([0c03e45](https://github.com/lidofinance/polygon-validators-monitoring/commit/0c03e455473c7a411cdfc3efc53ce50ba4526fae))
* make block handle chunk configurable ([8280507](https://github.com/lidofinance/polygon-validators-monitoring/commit/82805074b66f48b7a47a520d9eeada3c5b6ce88a))


### Performance Improvements

* replace TypeORM ordered queries with min/max and exists checks ([#40](https://github.com/lidofinance/polygon-validators-monitoring/issues/40)) ([3b37193](https://github.com/lidofinance/polygon-validators-monitoring/commit/3b37193331cdf926ba5b2432261724cd2408a186))



# [0.5.0](https://github.com/lidofinance/polygon-validators-monitoring/compare/0.4.0...0.5.0) (2023-02-03)


### Bug Fixes

* update PoLidoV2 contracts addresses ([8f6955e](https://github.com/lidofinance/polygon-validators-monitoring/commit/8f6955eb1cb5f710806fddfe7ea9a2d1fb381e81))


### Features

* expose provider to RPC metrics ([a6bbc23](https://github.com/lidofinance/polygon-validators-monitoring/commit/a6bbc2361a4d1655a457e0c72066fb65e885a6ec))



# [0.4.0](https://github.com/lidofinance/polygon-validators-monitoring/compare/0.3.0...0.4.0) (2023-01-18)


### Bug Fixes

* staticIds may be undefined ([98aa571](https://github.com/lidofinance/polygon-validators-monitoring/commit/98aa5712603e6c8a11d936a8943ed42c15cba137))
* TRACKED_IDS env value transformation ([c339a3f](https://github.com/lidofinance/polygon-validators-monitoring/commit/c339a3fe54bd3db8091ebec8127cee731a497b6d))


### Features

* undefined key in ids buffer ([2ccf242](https://github.com/lidofinance/polygon-validators-monitoring/commit/2ccf242b92e8df087392b68f94655e023226a53d))



# [0.3.0](https://github.com/lidofinance/polygon-validators-monitoring/compare/0.2.0...0.3.0) (2023-01-17)


### Bug Fixes

* await isPolidoV1 ([3df6e87](https://github.com/lidofinance/polygon-validators-monitoring/commit/3df6e87c40a82fc8df665d181d62c31886e39062))
* do not fail on unhandledRejection ([7de4f72](https://github.com/lidofinance/polygon-validators-monitoring/commit/7de4f72e8e193e48fb5c512285006309a0ff26b4))
* inconsistent checkpoints for new cycle ([ec6c5f9](https://github.com/lidofinance/polygon-validators-monitoring/commit/ec6c5f9b26c26a26db8ae1d6fcee97a7b0b41031))
* join errors with \n ([f4b1121](https://github.com/lidofinance/polygon-validators-monitoring/commit/f4b112106b014bca5cfeda7068fac9243264974f))
* one more fix for PoLido version check ([f12a20e](https://github.com/lidofinance/polygon-validators-monitoring/commit/f12a20e15684e7c1b9a7ed8979e26a1e65a9913b))
* return back averages metrics ([a0b1141](https://github.com/lidofinance/polygon-validators-monitoring/commit/a0b1141e371a15d220b90b08d674aa97b907445e))
* set actual checkpoint for PB bump ([3f25484](https://github.com/lidofinance/polygon-validators-monitoring/commit/3f254844f735b9326beb5681aadc89507b892a7f))
* update the way we determine PoLido version ([d5b3eac](https://github.com/lidofinance/polygon-validators-monitoring/commit/d5b3eac6f9883a94e9345398574c1db885e91395))


### Features

* add avg over Lido graph ([2401b6f](https://github.com/lidofinance/polygon-validators-monitoring/commit/2401b6f75d48cd64ce912e595e0870a11b08e6b4))
* new main cycle routine ([dae69c8](https://github.com/lidofinance/polygon-validators-monitoring/commit/dae69c8f4105f14b38c0db68bc07aeab7be9d44f))
* pip-4 ([64d5591](https://github.com/lidofinance/polygon-validators-monitoring/commit/64d5591c1807b5c6cb822075cebcbe9a2785e462))



# 0.2.0 (2022-11-09)



